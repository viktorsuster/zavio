# Profile API - Frontend Dokumentácia

Stručná dokumentácia pre frontend vývojárov.

## 1. GET Môj profil

**Endpoint:** `GET /api/users/auth/profile`  
**Autentifikácia:** Áno (Bearer token)  
**Payload:** Žiadny

**Response 200:**

```json
{
  "user": {
    "id": 1,
    "name": "Peter Novák",
    "avatar": "https://...",
    "credits": 120.5,
    "interests": ["Padel", "Tenis"],
    "email": "user@example.com",
    "phone": "+421 901 234 567",
    "joinedDate": "2025-12-11T14:00:27.000Z"
  }
}
```

---

## 2. PATCH Aktualizácia záujmov

**Endpoint:** `PATCH /api/users/auth/profile`  
**Autentifikácia:** Áno (Bearer token)  
**Payload:**

```json
{
  "interests": ["Padel", "Tenis", "Futbal"]
}
```

**Response 200:**

```json
{
  "success": true,
  "user": {
    "id": 1,
    "name": "Peter Novák",
    "avatar": "https://...",
    "credits": 120.5,
    "interests": ["Padel", "Tenis", "Futbal"],
    "email": "user@example.com",
    "phone": "+421 901 234 567",
    "joinedDate": "2025-12-11T14:00:27.000Z"
  }
}
```

**Error 400:** `interests` nie je pole alebo obsahuje non-string hodnoty

---

## 3. GET Verejný profil hráča

**Endpoint:** `GET /api/users/:userId/profile`  
**Autentifikácia:** Nie  
**Payload:** Žiadny (userId v URL)

**Response 200:**

```json
{
  "user": {
    "id": 2,
    "name": "Jano Hráč",
    "avatar": "https://...",
    "interests": ["Futbal", "Basketbal"],
    "joinedDate": "2024-09-01"
  }
}
```

**Response 404:** User neexistuje

---

## 4. GET Katalóg športov

**Endpoint:** `GET /api/sports`  
**Autentifikácia:** Nie  
**Payload:** Žiadny

**Response 200:**

```json
{
  "data": [
    "Futbal",
    "Tenis",
    "Padel",
    "Basketbal",
    "Bedminton",
    "Volejbal",
    "Florbal"
  ]
}
```

---

## 5. GET História aktivít

**Endpoint:** `GET /api/users/me/activity?page=1&limit=20`  
**Autentifikácia:** Áno (Bearer token)  
**Payload:** Žiadny  
**Query params:**

- `page` (optional, default: 1)
- `limit` (optional, default: 20)

**Response 200:**

```json
{
  "data": [
    {
      "id": "act_1",
      "type": "booking",
      "sport": "Padel",
      "fieldId": 123,
      "fieldName": "Arena Nivy",
      "location": "Bratislava, Nivy",
      "startAt": "2025-12-01T18:00:00.000Z",
      "endAt": "2025-12-01T19:30:00.000Z",
      "status": "completed",
      "price": 24.0
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

**Status hodnoty:** `"confirmed"`, `"completed"`, `"cancelled"`

---

## Base URL

```
https://api.sportvia.cloud
```

alebo

```
http://localhost:3004
```

## Autentifikácia

Pre chránené endpointy poslať header:

```
Authorization: Bearer <token>
```
