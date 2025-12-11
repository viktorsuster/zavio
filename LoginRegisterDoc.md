# Zavio API Dokumentácia

## Base URL

- Production: `https://app.zavio.cloud`
- Development: `http://localhost:3004`

## Autentifikácia

Všetky protected endpointy vyžadujú JWT token v headeri:

```
Authorization: Bearer <token>
```

---

## Owners (Admin Panel) Endpointy

### POST /api/owners/auth/register

Registrácia vlastníka športoviska.

**Request Body:**

```json
{
  "email": "admin@zavio.sk",
  "password": "heslo123",
  "facilityName": "Tenisové centrum Nivy",
  "contactName": "Ján Novák",
  "phone": "+421 900 123 456"
}
```

**Response (201 Created):**

```json
{
  "message": "Owner registered successfully.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "owner": {
    "id": 1,
    "email": "admin@zavio.sk",
    "facilityName": "Tenisové centrum Nivy",
    "contactName": "Ján Novák"
  }
}
```

**Error Responses:**

- `400` - Missing required fields
- `400` - Email already registered
- `500` - Error registering owner

---

### POST /api/owners/auth/login

Prihlásenie vlastníka.

**Request Body:**

```json
{
  "email": "admin@zavio.sk",
  "password": "heslo123"
}
```

**Response (200 OK):**

```json
{
  "message": "Login successful.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "owner": {
    "id": 1,
    "email": "admin@zavio.sk",
    "facilityName": "Tenisové centrum Nivy",
    "contactName": "Ján Novák",
    "phone": "+421 900 123 456"
  }
}
```

**Error Responses:**

- `400` - Email and password required
- `401` - Invalid email or password
- `500` - Error logging in

---

### GET /api/owners/auth/profile

Získanie profilu vlastníka (protected).

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "owner": {
    "id": 1,
    "email": "admin@zavio.sk",
    "facility_name": "Tenisové centrum Nivy",
    "contact_name": "Ján Novák",
    "phone": "+421 900 123 456",
    "created_at": "2025-12-11T14:00:00.000Z"
  }
}
```

**Error Responses:**

- `403` - No token provided
- `401` - Unauthorized. Invalid token
- `403` - Access denied. Owner role required
- `404` - Owner not found
- `500` - Error fetching profile

---

### POST /api/owners/fields

Vytvorenie nového ihriska (protected).

**Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "name": "Centrálny kurt A",
  "type": "Tenis",
  "location": "Národné tenisové centrum, Bratislava",
  "pricePerSlot": 15.0,
  "imageUrl": "https://example.com/image.jpg",
  "status": "active"
}
```

**Response (201 Created):**

```json
{
  "message": "Field created successfully.",
  "field": {
    "id": 1,
    "owner_id": 1,
    "name": "Centrálny kurt A",
    "type": "Tenis",
    "location": "Národné tenisové centrum, Bratislava",
    "price_per_slot": "15.00",
    "image_url": "https://example.com/image.jpg",
    "status": "active",
    "qr_code_id": "FIELD-8B08E0DB",
    "created_at": "2025-12-11T14:00:00.000Z"
  }
}
```

**Error Responses:**

- `400` - Missing required fields
- `403` - No token provided / Invalid token
- `403` - Access denied. Owner role required
- `500` - Error creating field

---

### GET /api/owners/fields

Zoznam všetkých ihrísk vlastníka (protected).

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "fields": [
    {
      "id": 1,
      "owner_id": 1,
      "name": "Centrálny kurt A",
      "type": "Tenis",
      "location": "Národné tenisové centrum, Bratislava",
      "price_per_slot": "15.00",
      "image_url": "https://example.com/image.jpg",
      "status": "active",
      "qr_code_id": "FIELD-8B08E0DB",
      "created_at": "2025-12-11T14:00:00.000Z"
    }
  ]
}
```

---

### GET /api/owners/fields/:id

Detail konkrétneho ihriska (protected).

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "field": {
    "id": 1,
    "owner_id": 1,
    "name": "Centrálny kurt A",
    "type": "Tenis",
    "location": "Národné tenisové centrum, Bratislava",
    "price_per_slot": "15.00",
    "image_url": "https://example.com/image.jpg",
    "status": "active",
    "qr_code_id": "FIELD-8B08E0DB",
    "created_at": "2025-12-11T14:00:00.000Z"
  }
}
```

**Error Responses:**

- `404` - Field not found
- `403` - Access denied

---

### PUT /api/owners/fields/:id

Úprava ihriska (protected).

**Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "name": "Centrálny kurt A - Upravené",
  "type": "Tenis",
  "location": "Národné tenisové centrum, Bratislava",
  "pricePerSlot": 18.0,
  "imageUrl": "https://example.com/new-image.jpg",
  "status": "active"
}
```

**Response (200 OK):**

```json
{
  "message": "Field updated successfully.",
  "field": {
    "id": 1,
    "owner_id": 1,
    "name": "Centrálny kurt A - Upravené",
    "type": "Tenis",
    "location": "Národné tenisové centrum, Bratislava",
    "price_per_slot": "18.00",
    "image_url": "https://example.com/new-image.jpg",
    "status": "active",
    "qr_code_id": "FIELD-8B08E0DB",
    "created_at": "2025-12-11T14:00:00.000Z"
  }
}
```

---

### DELETE /api/owners/fields/:id

Zmazanie ihriska (protected).

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "message": "Field deleted successfully."
}
```

---

## Users (Mobile App) Endpointy

### POST /api/users/auth/register

Registrácia používateľa mobilnej aplikácie.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "heslo123",
  "name": "Peter Novák",
  "phone": "+421 901 234 567"
}
```

**Response (201 Created):**

```json
{
  "message": "User registered successfully.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "Peter Novák",
    "phone": "+421 901 234 567",
    "credits": "0.00",
    "joined_date": "2025-12-11T14:00:27.000Z"
  }
}
```

**Error Responses:**

- `400` - Missing required fields
- `400` - Email already registered
- `500` - Error registering user

---

### POST /api/users/auth/login

Prihlásenie používateľa.

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
  "message": "Login successful.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "Peter Novák",
    "phone": "+421 901 234 567",
    "credits": 0.0,
    "joinedDate": "2025-12-11T14:00:27.000Z"
  }
}
```

**Error Responses:**

- `400` - Email and password required
- `401` - Invalid email or password
- `500` - Error logging in

---

### GET /api/users/auth/profile

Získanie profilu používateľa (protected).

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "Peter Novák",
    "phone": "+421 901 234 567",
    "credits": 0.0,
    "profileImageUrl": null,
    "joinedDate": "2025-12-11T14:00:27.000Z"
  }
}
```

**Error Responses:**

- `403` - No token provided
- `401` - Unauthorized. Invalid token
- `403` - Access denied. User role required
- `404` - User not found
- `500` - Error fetching profile

---

## Mobile QR Code Endpointy

### GET /api/mobile/qr/:qrCodeId

Validácia QR kódu ihriska.

**Response (200 OK):**

```json
{
  "field": {
    "id": 1,
    "name": "Centrálny kurt A",
    "type": "Tenis",
    "location": "Národné tenisové centrum, Bratislava",
    "status": "active"
  },
  "accessGranted": false,
  "message": "QR code validated. Booking check not yet implemented."
}
```

**Error Responses:**

- `404` - Field not found
- `500` - Error validating QR code

---

## Typy športov (SportType)

- `Tenis`
- `Padel`
- `Futbal`
- `Basketbal`

## Statusy ihriska

- `active` - Aktívne
- `maintenance` - Údržba

## Statusy rezervácie

- `confirmed` - Potvrdená
- `pending` - Čaká na schválenie
- `cancelled` - Zrušená

## HTTP Status Codes

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error
