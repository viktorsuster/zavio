# Kreditný systém — KREDITA API

Externá API pre správu kreditov a objednávok.

**Base URL:** `https://kredita.realvia.sk`

**Autentifikácia:** Bearer token v headeri:
```
Authorization: Bearer <token>
```

---

## GET /api/v1/isready

Kontrola či je server pripravený.

**Autentifikácia:** Nie

**Response (200 OK):**
```json
{"status":"OK"}
```

---

## POST /api/v1/user/registration

Registrácia nového používateľa.

**Autentifikácia:** Nie

**Request Body:**
```json
{
  "name": "Janko Hráško",
  "email": "test@test.sk",
  "password": "heslo123",
  "origin": "mydomain.com",
  "invoice_data": {
    "type": "individual",
    "name": "Janko Hráško",
    "address": "Hlavná 1",
    "zip": "04001",
    "city": "Košice",
    "country": "Slovakia"
  }
}
```

**Request Fields:**

- `name`* (string) — Celé meno používateľa
- `email`* (string) — Email (musí byť unikátny)
- `password`* (string) — Heslo
- `origin` (string) — Doména z ktorej sa registruje
- `invoice_data` (object) — Fakturačné údaje:
  - `type` (string) — `individual` alebo `company`
  - `name` (string)
  - `address` (string)
  - `zip` (string)
  - `city` (string)
  - `country` (string)
  - `vat` (string) — IČ DPH (pre firmy)
  - `tax` (string)
  - `taxic` (string)

**Response (200 OK):**
```json
{
  "token": "eyJ...",
  "exp": 1745564545
}
```

- `token` (string) — JWT token (TTL: 1 hodina)
- `exp` (timestamp) — Čas expirácie tokenu

---

## POST /api/v1/user/login

Prihlásenie používateľa.

**Autentifikácia:** Nie

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "heslo123"
}
```

**Response (200 OK):**
```json
{
  "token": "eyJ...",
  "exp": 17545454
}
```

- `token` (string) — JWT token
- `exp` (number) — Expirácia v sekundách

---

## POST /api/v1/user/info

Získanie informácií o používateľovi — zostatok kreditov + história transakcií.

**Autentifikácia:** Povinná

**Query Parameters (voliteľné):**
- `page` — Číslo stránky pre transakcie (default: 1)

**Response (200 OK):**
```json
{
  "credit": 150.00,
  "transactions": {
    "total": 5,
    "page": 1,
    "per_page": 20,
    "transactions": [
      {
        "type": "credit",
        "amount": 100.00,
        "service": "",
        "description": "Dobíjanie kreditov",
        "created_at": "2025-06-10T10:00:00Z"
      }
    ]
  }
}
```

**Response Fields:**

- `credit` (number) — Aktuálny zostatok kreditov
- `transactions.total` (number) — Celkový počet transakcií
- `transactions.page` (number) — Aktuálna stránka
- `transactions.per_page` (number) — Počet záznamov na stránku
- `transactions.transactions[]`:
  - `type` (string) — Typ transakcie
  - `amount` (number) — Suma
  - `service` (string) — Kód služby
  - `description` (string) — Popis
  - `created_at` (string) — Čas vytvorenia

---

## GET /api/v1/services

Zoznam dostupných aktívnych služieb.

**Autentifikácia:** Nie

**Response (200 OK):**
```json
{
  "services": [
    {
      "id": 1,
      "code": "aml_fo",
      "name": "Názov služby",
      "description": "Popis služby",
      "active": true,
      "created_at": {
        "date": "2025-01-01 00:00:00.000000",
        "timezone_type": 3,
        "timezone": "UTC"
      },
      "price": 5.00
    }
  ]
}
```

- `code` (string) — Kód služby, používa sa pri vytváraní objednávky
- `price` (number) — Cena služby v kreditoch

---

## POST /api/v1/order

Vytvorenie objednávky (odpočítanie kreditov za službu).

**Autentifikácia:** Povinná

**Request Body:**
```json
{
  "service": "aml_fo"
}
```

- `service`* (string) — Kód služby z `/api/v1/services`

---

## POST /api/v1/checkorder

Overenie stavu objednávky.

**Autentifikácia:** Povinná

**Request Body:**
```json
{
  "service": "aml_fo"
}
```

---

## POST /payment/24form

Platobný formulár pre dobíjanie kreditov.

**Autentifikácia:** Povinná

**Request Body:**
```json
{
  "service": "aml_fo"
}
```
