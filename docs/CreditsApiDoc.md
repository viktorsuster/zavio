# Backend API - Dobíjanie kreditov

Tento dokument popisuje endpoint pre dobíjanie kreditov používateľa.

---

## POST /api/users/credits/top-up

**Popis**: Dobitie kreditov na účet používateľa.

**Autentifikácia**: **Povinná** (Bearer token)

**Request Body**:

```json
{
  "amount": 50.0
}
```

**Request Fields**:

- `amount` (number, required) - Suma v EUR, ktorú chce používateľ dobiť (min: 1.0, max: 1000.0)

**Príklad requestu**:

```javascript
fetch("https://app.sportvia.cloud/api/users/credits/top-up", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer {token}",
  },
  body: JSON.stringify({
    amount: 50.0,
  }),
});
```

**Úspešná odpoveď (200 OK)**:

```json
{
  "message": "Kredity boli úspešne dobité",
  "user": {
    "id": 1,
    "credits": 50.0
  },
  "transaction": {
    "id": 123,
    "amount": 50.0,
    "type": "top-up",
    "createdAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**Response Fields**:

- `message` (string) - Správa o úspešnosti
- `user` (object) - Aktualizované údaje používateľa
  - `id` (number) - ID používateľa
  - `credits` (number) - Nový zostatok kreditov
- `transaction` (object) - Informácie o transakcii
  - `id` (number) - ID transakcie
  - `amount` (number) - Dobitá suma
  - `type` (string) - Typ transakcie (`top-up`)
  - `createdAt` (string) - Dátum vytvorenia (ISO 8601)

**Validácia a obchodná logika**:

1. Overiť, či `amount` je v platnom rozsahu (1.0 - 1000.0 EUR)
2. Pridať sumu k existujúcim kreditom používateľa
3. Vytvoriť záznam o transakcii (pre budúcu históriu)
4. Vrátiť aktualizované kredity

**Error Responses**:

- `400 Bad Request`:
  - Neplatné dáta (chýbajúce alebo neplatné `amount`)
  - `amount` mimo povoleného rozsahu
  ```json
  {
    "error": "Invalid amount",
    "message": "Suma musí byť medzi 1.0 a 1000.0 EUR."
  }
  ```
- `401 Unauthorized`: Chýbajúci alebo neplatný token
- `500 Internal Server Error`: Chyba servera

---

## Alternatíva: Počiatočné kredity pri registrácii

Ak backend nechce implementovať endpoint na dobíjanie, môže nastaviť počiatočné kredity pri registrácii:

**Odporúčanie**: Pri registrácii nového používateľa nastaviť `credits: 50.0` (alebo inú sumu) namiesto `0.0`, aby mohli používatelia hneď testovať rezervácie.

**Zmena v `/api/users/auth/register`**:

- Pri vytváraní nového používateľa nastaviť `credits` na `50.0` namiesto `0.0`

---

## TypeScript Interface

```typescript
export interface TopUpRequest {
  amount: number; // 1.0 - 1000.0
}

export interface TopUpResponse {
  message: string;
  user: {
    id: number;
    credits: number;
  };
  transaction: {
    id: number;
    amount: number;
    type: "top-up";
    createdAt: string;
  };
}
```

---

## Priorita implementácie

1. **VYSOKÁ PRIORITA** (pre testovanie):

   - 🟡 Nastaviť počiatočné kredity pri registrácii na `50.0` EUR (rýchle riešenie)

2. **STREDNÁ PRIORITA** (pre produkciu):
   - 🟡 POST /api/users/credits/top-up (pre skutočné dobíjanie kreditov)
