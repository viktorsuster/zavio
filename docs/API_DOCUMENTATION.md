# sportvia API Dokumentácia

## Base URL

- Production: `https://app.sportvia.cloud`
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
  "email": "admin@sportvia.sk",
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
    "email": "admin@sportvia.sk",
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
  "email": "admin@sportvia.sk",
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
    "email": "admin@sportvia.sk",
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
    "email": "admin@sportvia.sk",
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

## Mobile Fields Endpointy

### GET /api/mobile/fields

Získanie zoznamu všetkých aktívnych ihrísk s informáciami o vlastníkovi (public endpoint).

**Response (200 OK):**

```json
{
  "fields": [
    {
      "id": 1,
      "name": "Centrálny kurt A",
      "type": "Tenis",
      "location": "Národné tenisové centrum, Bratislava",
      "pricePerSlot": 15.0,
      "imageUrl": "https://example.com/image.jpg",
      "status": "active",
      "qrCodeId": "FIELD-8B08E0DB",
      "createdAt": "2025-12-11T14:00:00.000Z",
      "owner": {
        "id": 1,
        "facilityName": "Tenisové centrum Nivy",
        "contactName": "Ján Novák",
        "phone": "+421 900 123 456"
      }
    }
  ],
  "count": 1
}
```

**Error Responses:**

- `500` - Error fetching fields

---

### GET /api/mobile/fields/:id

Detail konkrétneho ihriska s informáciami o vlastníkovi (public endpoint).

**Response (200 OK):**

```json
{
  "field": {
    "id": 1,
    "name": "Centrálny kurt A",
    "type": "Tenis",
    "location": "Národné tenisové centrum, Bratislava",
    "pricePerSlot": 15.0,
    "imageUrl": "https://example.com/image.jpg",
    "status": "active",
    "qrCodeId": "FIELD-8B08E0DB",
    "createdAt": "2025-12-11T14:00:00.000Z",
    "owner": {
      "id": 1,
      "facilityName": "Tenisové centrum Nivy",
      "contactName": "Ján Novák",
      "phone": "+421 900 123 456"
    }
  }
}
```

**Error Responses:**

- `404` - Field not found
- `500` - Error fetching field

---

## User Credits Endpointy

### POST /api/users/credits/top-up

Dobitie kreditov na účet používateľa.

**Autentifikácia:** Vyžaduje sa JWT token používateľa (user role) v headeri `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "amount": 50.0
}
```

**Response (200 OK):**

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

**Error Responses:**

- `400 Bad Request` - Neplatná suma (mimo rozsahu 1.0 - 1000.0 EUR):

```json
{
  "error": "Invalid amount",
  "message": "Suma musí byť medzi 1.0 a 1000.0 EUR."
}
```

- `401 Unauthorized` - Neplatný alebo chýbajúci token
- `404 Not Found` - Používateľ nebol nájdený
- `500 Internal Server Error` - Chyba servera

**Validácia:**

- `amount` musí byť číslo
- `amount` musí byť v rozsahu 1.0 - 1000.0 EUR
- Suma sa pridá k existujúcim kreditom používateľa

---

## Mobile QR Code Endpointy

### GET /api/mobile/qr/:qrCodeId

Validácia QR kódu ihriska a kontrola prístupu na základe rezervácie.

**Autentifikácia:** Vyžaduje sa JWT token používateľa (user role) v headeri `Authorization: Bearer <token>`

**Request:**

- URL parameter: `qrCodeId` - UUID z QR kódu (extrahované z linku `https://sportvia.cloud/qr/{qrCodeId}`)

**Response (200 OK) - Prístup povolený:**

```json
{
  "field": {
    "id": 1,
    "name": "Centrálny kurt A",
    "type": "Tenis",
    "location": "Národné tenisové centrum, Bratislava"
  },
  "accessGranted": true,
  "message": "Ihrisko je odomknuté. Môžete vstúpiť.",
  "booking": {
    "id": 123,
    "date": "2025-12-15",
    "startTime": "14:00",
    "endTime": "15:00"
  }
}
```

**Response (200 OK) - Prístup zamietnutý:**

```json
{
  "field": {
    "id": 1,
    "name": "Centrálny kurt A",
    "type": "Tenis",
    "location": "Národné tenisové centrum, Bratislava"
  },
  "accessGranted": false,
  "message": "Nemáte aktívnu rezerváciu pre toto ihrisko v tomto čase.",
  "booking": null
}
```

**Error Responses:**

- `401` - Unauthorized (neplatný alebo chýbajúci token)
- `403` - Access denied (nie je user role)
- `404` - Field not found
- `500` - Error validating QR code

**Poznámky:**

- Endpoint kontroluje, či má používateľ aktívnu rezerváciu pre dané ihrisko v aktuálnom čase
- Tolerancia času: ±15 minút pred/po čase rezervácie
- Po úspešnom prístupe sa rezervácia označí ako `checked_in`
- QR kód obsahuje link vo formáte: `https://sportvia.cloud/qr/{qrCodeId}`

---

## Feed (Posts) Endpointy

Všetky feed endpointy vyžadujú autentifikáciu používateľa (user role) v headeri `Authorization: Bearer <token>`.

### GET /api/posts

Získanie zoznamu príspevkov (feed) s pagination.

**Headers:**

```
Authorization: Bearer <token>
```

**Query Parameters (voliteľné):**

- `page` - Číslo stránky (default: 1)
- `limit` - Počet príspevkov na stránku (default: 20)

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": "1",
      "userId": "5",
      "userName": "Peter Novák",
      "userAvatar": "https://example.com/avatar.jpg",
      "content": "Dnes skvelý zápas!",
      "image": "https://example.com/post-image.jpg",
      "timestamp": 1715500000000,
      "likes": 5,
      "likedBy": ["2", "3", "7", "8", "9"],
      "comments": [
        {
          "id": "10",
          "userId": "2",
          "userName": "Ján Novák",
          "userAvatar": "https://example.com/avatar2.jpg",
          "content": "Super!",
          "timestamp": 1715500100000,
          "likes": 2,
          "likedBy": ["3", "5"]
        }
      ]
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

**Error Responses:**

- `401` - Unauthorized (neplatný alebo chýbajúci token)
- `403` - Access denied (nie je user role)
- `500` - Error fetching posts

---

### POST /api/posts

Vytvorenie nového príspevku.

**Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "content": "Text príspevku...",
  "image": "https://example.com/image.jpg"
}
```

**Poznámky:**

- `content` je povinné (max 5000 znakov)
- `image` je voliteľné (URL obrázka alebo Base64 po uploade)

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": "15",
    "userId": "5",
    "userName": "Peter Novák",
    "userAvatar": "https://example.com/avatar.jpg",
    "content": "Text príspevku...",
    "image": "https://example.com/image.jpg",
    "timestamp": 1715500000000,
    "likes": 0,
    "likedBy": [],
    "comments": []
  }
}
```

**Error Responses:**

- `400` - Content is required / Content is too long
- `401` - Unauthorized
- `403` - Access denied
- `500` - Error creating post

---

### GET /api/posts/:postId

Získanie detailu konkrétneho príspevku vrátane všetkých komentárov.

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "id": "1",
  "userId": "5",
  "userName": "Peter Novák",
  "userAvatar": "https://example.com/avatar.jpg",
  "content": "Dnes skvelý zápas!",
  "image": "https://example.com/post-image.jpg",
  "timestamp": 1715500000000,
  "likes": 5,
  "likedBy": ["2", "3", "7", "8", "9"],
  "comments": [
    {
      "id": "10",
      "userId": "2",
      "userName": "Ján Novák",
      "userAvatar": "https://example.com/avatar2.jpg",
      "content": "Super!",
      "timestamp": 1715500100000,
      "likes": 2,
      "likedBy": ["3", "5"]
    }
  ]
}
```

**Error Responses:**

- `400` - Invalid post ID
- `404` - Post not found
- `401` - Unauthorized
- `500` - Error fetching post

---

### POST /api/posts/:postId/like

Prepnutie stavu "like" pre daný príspevok. Ak používateľ už lajkoval, like sa odoberie, inak sa pridá.

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "liked": true,
  "likesCount": 6
}
```

**Poznámky:**

- `liked: true` znamená, že like bol pridaný
- `liked: false` znamená, že like bol odobraný
- `likesCount` je nový počet lajkov

**Error Responses:**

- `400` - Invalid post ID
- `404` - Post not found
- `401` - Unauthorized
- `500` - Error toggling like

---

### POST /api/posts/:postId/comments

Pridanie komentára k príspevku.

**Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "content": "Môj komentár..."
}
```

**Poznámky:**

- `content` je povinné (max 2000 znakov)

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": "25",
    "userId": "3",
    "userName": "Ján Novák",
    "userAvatar": "https://example.com/avatar2.jpg",
    "content": "Môj komentár...",
    "timestamp": 1715500200000,
    "likes": 0,
    "likedBy": []
  }
}
```

**Error Responses:**

- `400` - Invalid post ID / Content is required / Content is too long
- `404` - Post not found
- `401` - Unauthorized
- `500` - Error creating comment

---

### POST /api/comments/:commentId/like

Prepnutie stavu "like" pre daný komentár. Podobne ako pri príspevku.

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "liked": true,
  "likesCount": 3
}
```

**Error Responses:**

- `400` - Invalid comment ID
- `404` - Comment not found
- `401` - Unauthorized
- `500` - Error toggling like

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
- `completed` - Dokončená
- `checked_in` - Používateľ sa prihlásil na ihrisko (po naskenovaní QR kódu)

## HTTP Status Codes

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error



