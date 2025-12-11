# Backend API - Rezervačný Flow

Tento dokument popisuje všetky endpointy, ktoré backend musí implementovať, aby mobilná aplikácia mohla fungovať s kompletným rezervačným flow.

## Existujúce endpointy

### ✅ GET /api/mobile/fields
- **Status**: Už implementované
- **Popis**: Získanie zoznamu všetkých aktívnych športovísk
- **Dokumentácia**: `FieldsApiDoc.md`

---

## Potrebné endpointy pre rezervačný flow

### 1. GET /api/mobile/fields/{fieldId}/availability

**Popis**: Získanie dostupných časových slotov pre konkrétne ihrisko, dátum a dĺžku rezervácie.

**Autentifikácia**: Nie je potrebná (public endpoint)

**URL Parameters**:
- `fieldId` (number, required) - ID ihriska

**Query Parameters**:
- `date` (string, required) - Dátum vo formáte `YYYY-MM-DD` (napr. `2025-01-15`)
- `duration` (number, required) - Dĺžka rezervácie v minútach (15, 30, 45, 60, 90, 120, atď.)

**Príklad requestu**:
```
GET /api/mobile/fields/1/availability?date=2025-01-15&duration=60
```

**Úspešná odpoveď (200 OK)**:
```json
{
  "fieldId": 1,
  "date": "2025-01-15",
  "duration": 60,
  "availableSlots": [
    {
      "startTime": "07:00",
      "endTime": "08:00",
      "price": 15.0
    },
    {
      "startTime": "08:00",
      "endTime": "09:00",
      "price": 15.0
    },
    {
      "startTime": "10:00",
      "endTime": "11:00",
      "price": 15.0
    }
  ],
  "count": 3
}
```

**Response Fields**:
- `fieldId` (number) - ID ihriska
- `date` (string) - Dátum pre ktorý sa kontroluje dostupnosť
- `duration` (number) - Dĺžka rezervácie v minútach
- `availableSlots` (array) - Zoznam dostupných časových slotov
  - `startTime` (string) - Začiatok slotu vo formáte `HH:MM` (24h formát)
  - `endTime` (string) - Koniec slotu vo formáte `HH:MM`
  - `price` (number) - Cena za tento slot v EUR
- `count` (number) - Počet dostupných slotov

**Poznámky**:
- Endpoint musí vrátiť len sloty, ktoré sú v budúcnosti (nie v minulosti)
- Endpoint musí vrátiť len sloty, ktoré nie sú už rezervované
- Endpoint musí kontrolovať, či slot neprekračuje otváracie hodiny ihriska (napr. 7:00 - 22:00)
- Endpoint musí vrátiť len sloty, ktoré majú dostatočnú dĺžku pre požadovanú `duration`
- Ak nie sú žiadne dostupné sloty, vrátiť prázdny array `[]`

**Error Responses**:
- `400 Bad Request`: Chýbajúce alebo neplatné query parametre
- `404 Not Found`: Ihrisko s daným ID neexistuje
- `500 Internal Server Error`: Chyba servera

---

### 2. POST /api/mobile/bookings

**Popis**: Vytvorenie novej rezervácie.

**Autentifikácia**: **Povinná** (Bearer token)

**Request Body**:
```json
{
  "fieldId": 1,
  "date": "2025-01-15",
  "startTime": "10:00",
  "duration": 60
}
```

**Request Fields**:
- `fieldId` (number, required) - ID ihriska
- `date` (string, required) - Dátum rezervácie vo formáte `YYYY-MM-DD`
- `startTime` (string, required) - Začiatok rezervácie vo formáte `HH:MM` (24h formát)
- `duration` (number, required) - Dĺžka rezervácie v minútach

**Príklad requestu**:
```javascript
fetch("https://app.zavio.cloud/api/mobile/bookings", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer {token}"
  },
  body: JSON.stringify({
    fieldId: 1,
    date: "2025-01-15",
    startTime: "10:00",
    duration: 60
  })
});
```

**Úspešná odpoveď (201 Created)**:
```json
{
  "message": "Rezervácia bola úspešne vytvorená",
  "booking": {
    "id": 123,
    "fieldId": 1,
    "fieldName": "Centrálny kurt A",
    "userId": 5,
    "date": "2025-01-15",
    "startTime": "10:00",
    "endTime": "11:00",
    "duration": 60,
    "pricePaid": 15.0,
    "status": "confirmed",
    "createdAt": "2025-01-10T14:30:00.000Z"
  },
  "user": {
    "id": 5,
    "credits": 85.0
  }
}
```

**Response Fields**:
- `message` (string) - Správa o úspešnosti
- `booking` (object) - Vytvorená rezervácia
  - `id` (number) - ID rezervácie
  - `fieldId` (number) - ID ihriska
  - `fieldName` (string) - Názov ihriska
  - `userId` (number) - ID používateľa
  - `date` (string) - Dátum rezervácie
  - `startTime` (string) - Začiatok rezervácie
  - `endTime` (string) - Koniec rezervácie (vypočítaný)
  - `duration` (number) - Dĺžka v minútach
  - `pricePaid` (number) - Zaplatená cena
  - `status` (string) - Status rezervácie (`confirmed`, `completed`, `cancelled`)
  - `createdAt` (string) - Dátum vytvorenia (ISO 8601)
- `user` (object) - Aktualizované údaje používateľa
  - `id` (number) - ID používateľa
  - `credits` (number) - Zostatok kreditov po zaplatení

**Validácia a obchodná logika**:
1. Overiť, či používateľ má dostatok kreditov
2. Overiť, či je slot dostupný (nie je už rezervovaný)
3. Overiť, či dátum a čas nie sú v minulosti
4. Odpočítať cenu z kreditov používateľa
5. Vytvoriť rezerváciu v databáze
6. Vrátiť vytvorenú rezerváciu a aktualizované kredity

**Error Responses**:
- `400 Bad Request`: 
  - Neplatné dáta (chýbajúce polia, neplatný formát)
  - Slot už nie je dostupný
  - Dátum/čas je v minulosti
- `401 Unauthorized`: Chýbajúci alebo neplatný token
- `402 Payment Required`: Nedostatok kreditov
  ```json
  {
    "error": "Insufficient credits",
    "message": "Nemáte dostatok kreditov. Potrebujete 15.0 €, máte 5.0 €.",
    "required": 15.0,
    "available": 5.0
  }
  ```
- `404 Not Found`: Ihrisko s daným ID neexistuje
- `409 Conflict`: Slot je už rezervovaný
- `500 Internal Server Error`: Chyba servera

---

### 3. GET /api/mobile/bookings

**Popis**: Získanie všetkých rezervácií prihláseného používateľa.

**Autentifikácia**: **Povinná** (Bearer token)

**Query Parameters** (všetky voliteľné):
- `status` (string) - Filtrovanie podľa statusu (`confirmed`, `completed`, `cancelled`)
- `fromDate` (string) - Začiatok rozsahu dátumov vo formáte `YYYY-MM-DD`
- `toDate` (string) - Koniec rozsahu dátumov vo formáte `YYYY-MM-DD`

**Príklady requestov**:
```
GET /api/mobile/bookings
GET /api/mobile/bookings?status=confirmed
GET /api/mobile/bookings?fromDate=2025-01-01&toDate=2025-01-31
```

**Úspešná odpoveď (200 OK)**:
```json
{
  "bookings": [
    {
      "id": 123,
      "fieldId": 1,
      "fieldName": "Centrálny kurt A",
      "fieldType": "Tenis",
      "fieldLocation": "Národné tenisové centrum, Bratislava",
      "fieldImageUrl": "https://example.com/image.jpg",
      "userId": 5,
      "date": "2025-01-15",
      "startTime": "10:00",
      "endTime": "11:00",
      "duration": 60,
      "pricePaid": 15.0,
      "status": "confirmed",
      "createdAt": "2025-01-10T14:30:00.000Z"
    },
    {
      "id": 124,
      "fieldId": 2,
      "fieldName": "Padel Aréna 1",
      "fieldType": "Padel",
      "fieldLocation": "Športpark Ružinov",
      "fieldImageUrl": "https://example.com/padel.jpg",
      "userId": 5,
      "date": "2025-01-20",
      "startTime": "14:00",
      "endTime": "15:30",
      "duration": 90,
      "pricePaid": 18.0,
      "status": "confirmed",
      "createdAt": "2025-01-12T09:15:00.000Z"
    }
  ],
  "count": 2
}
```

**Response Fields**:
- `bookings` (array) - Zoznam rezervácií
  - `id` (number) - ID rezervácie
  - `fieldId` (number) - ID ihriska
  - `fieldName` (string) - Názov ihriska
  - `fieldType` (string) - Typ športu
  - `fieldLocation` (string) - Lokalita ihriska
  - `fieldImageUrl` (string | null) - URL obrázka ihriska
  - `userId` (number) - ID používateľa
  - `date` (string) - Dátum rezervácie
  - `startTime` (string) - Začiatok rezervácie
  - `endTime` (string) - Koniec rezervácie
  - `duration` (number) - Dĺžka v minútach
  - `pricePaid` (number) - Zaplatená cena
  - `status` (string) - Status rezervácie
  - `createdAt` (string) - Dátum vytvorenia (ISO 8601)
- `count` (number) - Počet rezervácií

**Poznámky**:
- Endpoint vracia len rezervácie prihláseného používateľa (podľa tokenu)
- Rezervácie by mali byť zoradené podľa dátumu a času (najbližšie prvé)
- Ak nie sú žiadne rezervácie, vrátiť prázdny array `[]`

**Error Responses**:
- `401 Unauthorized`: Chýbajúci alebo neplatný token
- `500 Internal Server Error`: Chyba servera

---

### 4. PATCH /api/mobile/bookings/{bookingId}/cancel

**Popis**: Zrušenie rezervácie.

**Autentifikácia**: **Povinná** (Bearer token)

**URL Parameters**:
- `bookingId` (number, required) - ID rezervácie

**Príklad requestu**:
```javascript
fetch("https://app.zavio.cloud/api/mobile/bookings/123/cancel", {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer {token}"
  }
});
```

**Úspešná odpoveď (200 OK)**:
```json
{
  "message": "Rezervácia bola úspešne zrušená",
  "booking": {
    "id": 123,
    "status": "cancelled",
    "cancelledAt": "2025-01-11T10:00:00.000Z"
  },
  "refund": {
    "amount": 15.0,
    "credits": 100.0
  }
}
```

**Response Fields**:
- `message` (string) - Správa o úspešnosti
- `booking` (object) - Aktualizovaná rezervácia
  - `id` (number) - ID rezervácie
  - `status` (string) - Nový status (`cancelled`)
  - `cancelledAt` (string) - Dátum zrušenia (ISO 8601)
- `refund` (object) - Informácie o vrátení peňazí
  - `amount` (number) - Vrátená suma
  - `credits` (number) - Nový zostatok kreditov

**Validácia a obchodná logika**:
1. Overiť, či rezervácia patrí prihlásenému používateľovi
2. Overiť, či rezervácia ešte nie je zrušená
3. Overiť, či rezervácia ešte neprebehla (ak je v minulosti, možno neumožniť zrušenie alebo vrátiť len časť)
4. Vrátiť kredity používateľovi
5. Aktualizovať status rezervácie na `cancelled`
6. Vrátiť aktualizovanú rezerváciu a kredity

**Error Responses**:
- `401 Unauthorized`: Chýbajúci alebo neplatný token
- `403 Forbidden`: Rezervácia nepatrí prihlásenému používateľovi
- `404 Not Found`: Rezervácia s daným ID neexistuje
- `400 Bad Request`: Rezervácia už je zrušená alebo nie je možné ju zrušiť
- `500 Internal Server Error`: Chyba servera

---

## TypeScript Interfaces

Pre referenciu, tu sú TypeScript interfaces, ktoré používa frontend:

```typescript
// Booking interface
export interface Booking {
  id: string; // alebo number na backend
  courtId: string; // alebo fieldId: number
  userId: string; // alebo number
  date: string; // YYYY-MM-DD
  time: string; // HH:MM Start Time
  duration: number; // in minutes
  status: "confirmed" | "completed" | "cancelled";
  pricePaid: number;
}

// Availability Slot interface
export interface AvailabilitySlot {
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  price: number;
}

// Availability Response interface
export interface AvailabilityResponse {
  fieldId: number;
  date: string;
  duration: number;
  availableSlots: AvailabilitySlot[];
  count: number;
}
```

---

## Priorita implementácie

1. **VYSOKÁ PRIORITA** (pre základnú funkcionalitu):
   - ✅ GET /api/mobile/fields (už existuje)
   - 🔴 GET /api/mobile/fields/{fieldId}/availability
   - 🔴 POST /api/mobile/bookings
   - 🔴 GET /api/mobile/bookings

2. **STREDNÁ PRIORITA** (pre kompletnú funkcionalitu):
   - 🟡 PATCH /api/mobile/bookings/{bookingId}/cancel

---

## Poznámky pre backend tím

1. **CORS**: Všetky endpointy musia podporovať CORS pre domény `https://zavio.cloud`, `https://app.zavio.cloud` a `http://localhost:3000`.

2. **Autentifikácia**: Endpointy, ktoré vyžadujú autentifikáciu, musia overiť Bearer token v headeri `Authorization: Bearer {token}`.

3. **Časové pásmo**: Všetky dátumy a časy by mali byť v UTC alebo s explicitným časovým pásmom. Frontend používa lokálny čas používateľa.

4. **Validácia**: Všetky vstupy musia byť validované (dátumy, časy, IDs, atď.).

5. **Error handling**: Všetky chyby by mali vracať konzistentný formát:
   ```json
   {
     "error": "Error code",
     "message": "Human readable error message"
   }
   ```

6. **Ceny**: Ceny sú v EUR a musia byť konzistentné s cenami z `/api/mobile/fields` (pole `pricePerSlot`).

7. **Dostupnosť slotov**: Backend musí kontrolovať existujúce rezervácie a vrátiť len skutočne dostupné sloty.

8. **Kredity**: Backend musí spravovať kredity používateľov a kontrolovať, či majú dostatok kreditov pred vytvorením rezervácie.

