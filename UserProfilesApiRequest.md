# User profily – návrh backend endpointov

Tento dokument popisuje, čo potrebujeme doplniť na backend, aby aplikácia vedela:

- otvoriť **profil používateľa** po kliknutí na autora príspevku/komentára (verejný profil),
- otvoriť **môj profil** (privátny profil),
- zobraziť **históriu “kedy/kde som bol hrať”**,
- umožniť používateľovi spravovať **záujmy (športy, o ktoré sa zaujíma)**.

## Kontext v appke

- V `FeedScreen` a `PostDetailScreen` po kliknutí na usera navigujeme na `PublicProfile` alebo `Profile` (ak je to current user).
- `PublicProfileScreen` je zatiaľ mock (používa `MOCK_ALL_USERS`), potrebujeme reálny endpoint.
- `ProfileScreen` má sekciu “Moje záujmy” a edit je riešený samostatnou obrazovkou (modal stack screen).

## Terminológia

- **interests**: športy, o ktoré má používateľ záujem (napr. Padel, Tenis). Nie je to úroveň – len zoznam.
- **activity/history**: zoznam odohraných/absolvovaných aktivít (typicky bookingy, check-iny, alebo completed zápasy).

## Autentifikácia

Všetky endpointy nižšie predpokladajú:

```
Authorization: Bearer <token>
```

## 1) Môj profil (privátne údaje)

### GET /api/users/me/profile

**Použitie:** `ProfileScreen` (môj profil), `UserContext` preload.

**Response 200:**

```json
{
  "user": {
    "id": "me",
    "name": "Martin Novák",
    "email": "martin@example.com",
    "avatar": "https://...",
    "phone": "+421900000000",
    "credits": 150.0,
    "interests": ["Futbal", "Padel"],
    "joinedDate": "2025-01-10"
  },
  "stats": {
    "matchesCount": 12,
    "reliabilityPercent": 85
  }
}
```

Poznámky:

- `interests` je nový field.
- `stats` môže byť separátne, aby sme ho vedeli dopĺňať bez rozbitia `User` objektu.

## 2) Verejný profil používateľa (klik na usera v poste/komente)

### GET /api/users/:userId/profile

**Použitie:** `PublicProfileScreen` po kliknutí na autora príspevku/komentára.

**Response 200:**

```json
{
  "user": {
    "id": "u2",
    "name": "Jano Hráč",
    "avatar": "https://...",
    "interests": ["Futbal", "Basketbal"],
    "joinedDate": "2024-09-01"
  },
  "stats": {
    "matchesCount": 12,
    "reliabilityPercent": 85
  }
}
```

Poznámky:

- Bez `email`, `phone`, `credits`.
- `interests` sa zobrazuje aj na public profile.

## 3) História “kedy/kde som bol hrať”

### GET /api/users/me/activity

**Použitie:** sekcia v `ProfileScreen` (“Kde som hral”).

**Query params (voliteľné):**

- `page` (default 1)
- `limit` (default 20)

**Response 200:**

```json
{
  "data": [
    {
      "id": "act_1",
      "type": "booking",
      "sport": "Futbal",
      "fieldId": 123,
      "fieldName": "Arena Nivy",
      "location": "Bratislava, Nivy",
      "startAt": "2025-12-01T18:00:00.000Z",
      "endAt": "2025-12-01T19:30:00.000Z",
      "status": "completed"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 50, "totalPages": 3 }
}
```

### GET /api/users/:userId/activity (voliteľné)

Ak chceme zobrazovať históriu aj na public profile, môže byť rovnaký endpoint aj pre cudzieho usera, prípadne s obmedzením údajov.

## 4) Update záujmov (športy)

### PATCH /api/users/me/profile

**Použitie:** edit v `ProfileScreen` (záujmy, neskôr aj iné nastavenia profilu).

**Request body:**

```json
{
  "interests": ["Padel", "Tenis"]
}
```

**Response 200:**

```json
{
  "success": true,
  "user": {
    "id": "me",
    "name": "Martin Novák",
    "email": "martin@example.com",
    "avatar": "https://...",
    "credits": 150.0,
    "interests": ["Padel", "Tenis"]
  }
}
```

Poznámky:

- endpoint môže byť aj špecifický: `PUT /api/users/me/interests` (ak preferujete menší scope).

## 5) (Voliteľné) Katalóg športov

### GET /api/sports

**Použitie:** zoznam dostupných športov pre UI (chips v modale).

**Response 200:**

```json
{
  "data": ["Futbal", "Tenis", "Padel", "Basketbal", "Bedminton"]
}
```

## Error stavy (všeobecne)

- `401` Unauthorized (token chýba/neplatný)
- `404` User not found (pri public profile)
- `400` Validation error (invalid interests values)
