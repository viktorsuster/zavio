# Frontend API Dokumentácia - Rezervácie a Dostupnosť

Tento dokument popisuje endpointy pre rezervácie a dostupnosť ihrísk z pohľadu frontend aplikácie (mobilná appka a admin panel).

---

## 1. GET /api/mobile/fields/:fieldId/availability

### Popis

Získa dostupné časové sloty pre konkrétne ihrisko v daný deň s určitou dĺžkou trvania.

### Request

**URL:** `https://app.zavio.cloud/api/mobile/fields/:fieldId/availability`

**Metóda:** `GET`

**Query Parametre:**

- `date` (required) - Dátum vo formáte `YYYY-MM-DD` (napr. `2025-12-15`)
- `duration` (required) - Dĺžka rezervácie v minútach (napr. `60`, `90`, `120`)

**Príklad:**

```javascript
const fieldId = 1;
const date = "2025-12-15";
const duration = 60; // 60 minút

const response = await fetch(
  `https://app.zavio.cloud/api/mobile/fields/${fieldId}/availability?date=${date}&duration=${duration}`
);
```

**Alebo s axios:**

```javascript
import axios from "axios";

const response = await axios.get(
  `https://app.zavio.cloud/api/mobile/fields/${fieldId}/availability`,
  {
    params: {
      date: "2025-12-15",
      duration: 60,
    },
  }
);
```

### Response

**Úspešná odpoveď (200 OK):**

```json
{
  "fieldId": 1,
  "date": "2025-12-15",
  "duration": 60,
  "availableSlots": [
    {
      "startTime": "07:00",
      "endTime": "08:00",
      "price": 10.0
    },
    {
      "startTime": "08:00",
      "endTime": "09:00",
      "price": 10.0
    },
    {
      "startTime": "09:00",
      "endTime": "10:00",
      "price": 10.0
    }
  ],
  "count": 15
}
```

**Chybové odpovede:**

- `400 Bad Request` - Chýbajúce alebo neplatné parametre:

```json
{
  "message": "Missing required parameters: date and duration are required."
}
```

- `404 Not Found` - Ihrisko neexistuje:

```json
{
  "message": "Field not found."
}
```

- `400 Bad Request` - Ihrisko nie je aktívne:

```json
{
  "message": "Field is not active."
}
```

### TypeScript Interface

```typescript
interface AvailabilitySlot {
  startTime: string; // Format: "HH:MM"
  endTime: string; // Format: "HH:MM"
  price: number; // Cena v EUR
}

interface AvailabilityResponse {
  fieldId: number;
  date: string; // Format: "YYYY-MM-DD"
  duration: number; // Dĺžka v minútach
  availableSlots: AvailabilitySlot[];
  count: number;
}
```

### Poznámky

- Endpoint automaticky filtruje sloty, ktoré sú v minulosti
- Endpoint kontroluje existujúce rezervácie a vylúči obsadené sloty
- Cena sa počíta ako `pricePerSlot * (duration / 60)` - teda cena za hodinu násobená počtom hodín
- Sloty sú generované od 07:00 do 22:00 s krokom podľa `duration`

---

## 2. POST /api/mobile/bookings

### Popis

Vytvorí novú rezerváciu pre prihláseného používateľa.

### Request

**URL:** `https://app.zavio.cloud/api/mobile/bookings`

**Metóda:** `POST`

**Autentifikácia:** Vyžaduje sa JWT token v headeri `Authorization: Bearer <token>`

**Body:**

```json
{
  "fieldId": 1,
  "date": "2025-12-15",
  "startTime": "14:00",
  "duration": 60
}
```

**Príklad s fetch:**

```javascript
const response = await fetch("https://app.zavio.cloud/api/mobile/bookings", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    fieldId: 1,
    date: "2025-12-15",
    startTime: "14:00",
    duration: 60,
  }),
});
```

**Príklad s axios:**

```javascript
import axios from "axios";

const response = await axios.post(
  "https://app.zavio.cloud/api/mobile/bookings",
  {
    fieldId: 1,
    date: "2025-12-15",
    startTime: "14:00",
    duration: 60,
  },
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);
```

### Response

**Úspešná odpoveď (201 Created):**

```json
{
  "message": "Rezervácia bola úspešne vytvorená",
  "booking": {
    "id": 123,
    "fieldId": 1,
    "fieldName": "Tenisové ihrisko 1",
    "userId": 45,
    "date": "2025-12-15",
    "startTime": "14:00",
    "endTime": "15:00",
    "duration": 60,
    "pricePaid": 10.0,
    "status": "confirmed",
    "createdAt": "2025-12-11T10:30:00.000Z"
  },
  "user": {
    "id": 45,
    "credits": 90.0
  }
}
```

**Chybové odpovede:**

- `400 Bad Request` - Chýbajúce alebo neplatné údaje:

```json
{
  "message": "Missing required fields: fieldId, date, startTime, duration."
}
```

- `402 Payment Required` - Nedostatok kreditov:

```json
{
  "error": "Insufficient credits",
  "message": "Nemáte dostatok kreditov. Potrebujete 10.00 €, máte 5.00 €.",
  "required": 10.0,
  "available": 5.0
}
```

- `409 Conflict` - Slot je už obsadený:

```json
{
  "message": "Slot is already booked."
}
```

- `404 Not Found` - Ihrisko neexistuje:

```json
{
  "message": "Field not found."
}
```

- `400 Bad Request` - Rezervácia v minulosti:

```json
{
  "message": "Cannot book in the past."
}
```

### TypeScript Interface

```typescript
interface CreateBookingRequest {
  fieldId: number;
  date: string; // Format: "YYYY-MM-DD"
  startTime: string; // Format: "HH:MM"
  duration: number; // Dĺžka v minútach
}

interface Booking {
  id: number;
  fieldId: number;
  fieldName: string;
  userId: number;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  pricePaid: number;
  status: "confirmed" | "cancelled" | "pending" | "completed";
  createdAt: string;
}

interface CreateBookingResponse {
  message: string;
  booking: Booking;
  user: {
    id: number;
    credits: number;
  };
}
```

### Poznámky

- Po úspešnom vytvorení rezervácie sa automaticky odpočítajú kredity z účtu používateľa
- Rezervácia sa vytvorí so statusom `confirmed`
- `endTime` sa automaticky vypočíta z `startTime` + `duration`
- Cena sa počíta ako `pricePerSlot * (duration / 60)`

---

## 3. GET /api/mobile/bookings

### Popis

Získa zoznam rezervácií pre prihláseného používateľa.

### Request

**URL:** `https://app.zavio.cloud/api/mobile/bookings`

**Metóda:** `GET`

**Autentifikácia:** Vyžaduje sa JWT token v headeri `Authorization: Bearer <token>`

**Query Parametre (voliteľné):**

- `status` - Filtrovať podľa statusu (`confirmed`, `cancelled`, `pending`, `completed`)
- `fromDate` - Začiatok dátumového rozsahu (format: `YYYY-MM-DD`)
- `toDate` - Koniec dátumového rozsahu (format: `YYYY-MM-DD`)

**Príklad:**

```javascript
const response = await fetch(
  "https://app.zavio.cloud/api/mobile/bookings?status=confirmed&fromDate=2025-12-01",
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);
```

**Príklad s axios:**

```javascript
import axios from "axios";

const response = await axios.get(
  "https://app.zavio.cloud/api/mobile/bookings",
  {
    params: {
      status: "confirmed",
      fromDate: "2025-12-01",
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);
```

### Response

**Úspešná odpoveď (200 OK):**

```json
{
  "bookings": [
    {
      "id": 123,
      "fieldId": 1,
      "fieldName": "Tenisové ihrisko 1",
      "fieldType": "Tenis",
      "fieldLocation": "Košice, Hlavná 1",
      "fieldImageUrl": "https://example.com/image.jpg",
      "userId": 45,
      "date": "2025-12-15",
      "startTime": "14:00",
      "endTime": "15:00",
      "duration": 60,
      "pricePaid": 10.0,
      "status": "confirmed",
      "createdAt": "2025-12-11T10:30:00.000Z"
    },
    {
      "id": 124,
      "fieldId": 2,
      "fieldName": "Padel ihrisko 2",
      "fieldType": "Padel",
      "fieldLocation": "Bratislava, Mierová 5",
      "fieldImageUrl": "https://example.com/image2.jpg",
      "userId": 45,
      "date": "2025-12-16",
      "startTime": "16:00",
      "endTime": "17:30",
      "duration": 90,
      "pricePaid": 15.0,
      "status": "confirmed",
      "createdAt": "2025-12-11T11:00:00.000Z"
    }
  ],
  "count": 2
}
```

**Chybové odpovede:**

- `401 Unauthorized` - Neplatný alebo chýbajúci token:

```json
{
  "message": "Unauthorized. Invalid token."
}
```

### TypeScript Interface

```typescript
interface Booking {
  id: number;
  fieldId: number;
  fieldName: string;
  fieldType: string;
  fieldLocation: string;
  fieldImageUrl: string | null;
  userId: number;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  pricePaid: number;
  status: "confirmed" | "cancelled" | "pending" | "completed";
  createdAt: string;
}

interface GetBookingsResponse {
  bookings: Booking[];
  count: number;
}
```

### Poznámky

- Rezervácie sú zoradené podľa dátumu a času (od najbližších)
- Ak nie sú špecifikované filtre, vráti všetky rezervácie používateľa
- Každá rezervácia obsahuje aj informácie o ihrisku (názov, typ, lokácia, obrázok)

---

## 4. PATCH /api/mobile/bookings/:bookingId/cancel

### Popis

Zruší existujúcu rezerváciu a vráti kredity späť na účet používateľa.

### Request

**URL:** `https://app.zavio.cloud/api/mobile/bookings/:bookingId/cancel`

**Metóda:** `PATCH`

**Autentifikácia:** Vyžaduje sa JWT token v headeri `Authorization: Bearer <token>`

**Príklad:**

```javascript
const bookingId = 123;

const response = await fetch(
  `https://app.zavio.cloud/api/mobile/bookings/${bookingId}/cancel`,
  {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);
```

**Príklad s axios:**

```javascript
import axios from "axios";

const response = await axios.patch(
  `https://app.zavio.cloud/api/mobile/bookings/${bookingId}/cancel`,
  {},
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);
```

### Response

**Úspešná odpoveď (200 OK):**

```json
{
  "message": "Rezervácia bola úspešne zrušená",
  "booking": {
    "id": 123,
    "status": "cancelled",
    "cancelledAt": "2025-12-11T12:00:00.000Z"
  },
  "refund": {
    "amount": 10.0,
    "credits": 100.0
  }
}
```

**Chybové odpovede:**

- `404 Not Found` - Rezervácia neexistuje:

```json
{
  "message": "Booking not found."
}
```

- `403 Forbidden` - Rezervácia nepatrí používateľovi:

```json
{
  "message": "Access denied. This booking does not belong to you."
}
```

- `400 Bad Request` - Rezervácia je už zrušená:

```json
{
  "message": "Booking is already cancelled."
}
```

### TypeScript Interface

```typescript
interface CancelBookingResponse {
  message: string;
  booking: {
    id: number;
    status: "cancelled";
    cancelledAt: string;
  };
  refund: {
    amount: number;
    credits: number; // Nový zostatok kreditov
  };
}
```

### Poznámky

- Po zrušení sa automaticky vráti plná suma kreditov späť na účet
- Status rezervácie sa zmení na `cancelled`
- Pole `cancelledAt` obsahuje dátum a čas zrušenia

---

## 5. GET /api/owners/fields/:fieldId/bookings (Admin Panel)

### Popis

Získa zoznam rezervácií pre konkrétne ihrisko (len pre vlastníka ihriska).

### Request

**URL:** `https://app.zavio.cloud/api/owners/fields/:fieldId/bookings`

**Metóda:** `GET`

**Autentifikácia:** Vyžaduje sa JWT token ownera v headeri `Authorization: Bearer <token>`

**Query Parametre (voliteľné):**

- `date` - Konkrétny dátum (format: `YYYY-MM-DD`)
- `fromDate` - Začiatok dátumového rozsahu (format: `YYYY-MM-DD`)
- `toDate` - Koniec dátumového rozsahu (format: `YYYY-MM-DD`)
- `status` - Filtrovať podľa statusu (`confirmed`, `cancelled`, `pending`, `completed`)

**Príklad:**

```javascript
const fieldId = 1;

const response = await fetch(
  `https://app.zavio.cloud/api/owners/fields/${fieldId}/bookings?status=confirmed&fromDate=2025-12-01`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);
```

### Response

**Úspešná odpoveď (200 OK):**

```json
{
  "bookings": [
    {
      "id": 123,
      "fieldId": 1,
      "fieldName": "Tenisové ihrisko 1",
      "userId": 45,
      "userName": "Ján Novák",
      "userEmail": "jan@example.com",
      "userPhone": "+421900123456",
      "date": "2025-12-15",
      "startTime": "14:00",
      "endTime": "15:00",
      "duration": 60,
      "price": 10.0,
      "status": "confirmed",
      "notes": null,
      "createdAt": "2025-12-11T10:30:00.000Z",
      "cancelledAt": null
    }
  ],
  "count": 1
}
```

**Chybové odpovede:**

- `404 Not Found` - Ihrisko neexistuje alebo nepatrí ownerovi:

```json
{
  "message": "Field not found or access denied."
}
```

### TypeScript Interface

```typescript
interface OwnerBooking {
  id: number;
  fieldId: number;
  fieldName: string;
  userId: number;
  userName: string;
  userEmail: string;
  userPhone: string | null;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  price: number;
  status: "confirmed" | "cancelled" | "pending" | "completed";
  notes: string | null;
  createdAt: string;
  cancelledAt: string | null;
}

interface GetOwnerBookingsResponse {
  bookings: OwnerBooking[];
  count: number;
}
```

---

## 6. GET /api/owners/fields/:fieldId/availability (Admin Panel)

### Popis

Získa obsadenosť ihriska s detailnými informáciami o rezerváciách.

### Request

**URL:** `https://app.zavio.cloud/api/owners/fields/:fieldId/availability`

**Metóda:** `GET`

**Autentifikácia:** Vyžaduje sa JWT token ownera v headeri `Authorization: Bearer <token>`

**Query Parametre (voliteľné):**

- `date` - Konkrétny dátum (format: `YYYY-MM-DD`)
- `fromDate` - Začiatok dátumového rozsahu (format: `YYYY-MM-DD`)
- `toDate` - Koniec dátumového rozsahu (format: `YYYY-MM-DD`)

**Príklad:**

```javascript
const fieldId = 1;

const response = await fetch(
  `https://app.zavio.cloud/api/owners/fields/${fieldId}/availability?date=2025-12-15`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);
```

### Response

**Úspešná odpoveď (200 OK):**

```json
{
  "fieldId": 1,
  "fieldName": "Tenisové ihrisko 1",
  "bookings": [
    {
      "id": 123,
      "date": "2025-12-15",
      "startTime": "14:00",
      "endTime": "15:00",
      "duration": 60,
      "status": "confirmed",
      "price": 10.0,
      "user": {
        "name": "Ján Novák",
        "email": "jan@example.com"
      }
    }
  ],
  "count": 1,
  "timeSlots": [
    {
      "startTime": "07:00",
      "endTime": "08:00"
    },
    {
      "startTime": "08:00",
      "endTime": "09:00"
    }
  ]
}
```

### TypeScript Interface

```typescript
interface AvailabilityBooking {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: string;
  price: number;
  user: {
    name: string;
    email: string;
  };
}

interface TimeSlot {
  startTime: string;
  endTime: string;
}

interface GetAvailabilityResponse {
  fieldId: number;
  fieldName: string;
  bookings: AvailabilityBooking[];
  count: number;
  timeSlots: TimeSlot[];
}
```

---

## 7. GET /api/owners/fields/:fieldId/calendar (Admin Panel)

### Popis

Získa kalendár rezervácií pre mesiac s agregovanými údajmi (počet rezervácií a príjem pre každý deň).

### Request

**URL:** `https://app.zavio.cloud/api/owners/fields/:fieldId/calendar`

**Metóda:** `GET`

**Autentifikácia:** Vyžaduje sa JWT token ownera v headeri `Authorization: Bearer <token>`

**Query Parametre (voliteľné):**

- `month` - Mesiac (1-12, format: `MM`)
- `year` - Rok (format: `YYYY`)

Ak nie sú špecifikované, použije sa aktuálny mesiac a rok.

**Príklad:**

```javascript
const fieldId = 1;
const month = "12";
const year = "2025";

const response = await fetch(
  `https://app.zavio.cloud/api/owners/fields/${fieldId}/calendar?month=${month}&year=${year}`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);
```

### Response

**Úspešná odpoveď (200 OK):**

```json
{
  "fieldId": 1,
  "month": 12,
  "year": 2025,
  "startDate": "2025-12-01",
  "endDate": "2025-12-31",
  "calendar": [
    {
      "date": "2025-12-15",
      "bookingCount": 5,
      "totalRevenue": 50.0
    },
    {
      "date": "2025-12-16",
      "bookingCount": 3,
      "totalRevenue": 30.0
    }
  ],
  "totalBookings": 8,
  "totalRevenue": 80.0
}
```

### TypeScript Interface

```typescript
interface CalendarDay {
  date: string; // Format: "YYYY-MM-DD"
  bookingCount: number;
  totalRevenue: number;
}

interface GetCalendarResponse {
  fieldId: number;
  month: number;
  year: number;
  startDate: string;
  endDate: string;
  calendar: CalendarDay[];
  totalBookings: number;
  totalRevenue: number;
}
```

### Poznámky

- `calendar` obsahuje len dni, ktoré majú aspoň jednu rezerváciu
- `totalBookings` a `totalRevenue` sú súčty pre celý mesiac
- Dni bez rezervácií nie sú v poli `calendar`

---

## React Hook Príklady

### useAvailability Hook

```typescript
import { useState, useEffect } from "react";
import axios from "axios";

const useAvailability = (fieldId: number, date: string, duration: number) => {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fieldId || !date || !duration) return;

    setLoading(true);
    setError(null);

    axios
      .get(
        `https://app.zavio.cloud/api/mobile/fields/${fieldId}/availability`,
        {
          params: { date, duration },
        }
      )
      .then((response) => {
        setSlots(response.data.availableSlots);
      })
      .catch((err) => {
        setError(
          err.response?.data?.message || "Chyba pri načítaní dostupnosti"
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [fieldId, date, duration]);

  return { slots, loading, error };
};
```

### useBookings Hook

```typescript
import { useState, useEffect } from "react";
import axios from "axios";

const useBookings = (
  token: string,
  filters?: {
    status?: string;
    fromDate?: string;
    toDate?: string;
  }
) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    setLoading(true);
    setError(null);

    axios
      .get("https://app.zavio.cloud/api/mobile/bookings", {
        headers: { Authorization: `Bearer ${token}` },
        params: filters,
      })
      .then((response) => {
        setBookings(response.data.bookings);
      })
      .catch((err) => {
        setError(
          err.response?.data?.message || "Chyba pri načítaní rezervácií"
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token, filters?.status, filters?.fromDate, filters?.toDate]);

  return { bookings, loading, error };
};
```

---

## Dôležité poznámky

1. **Autentifikácia:** Všetky endpointy okrem `GET /api/mobile/fields/:fieldId/availability` vyžadujú JWT token v headeri `Authorization: Bearer <token>`

2. **Formát dátumov:** Všetky dátumy sú vo formáte `YYYY-MM-DD` (ISO 8601)

3. **Formát času:** Všetky časy sú vo formáte `HH:MM` (24-hodinový formát)

4. **CORS:** Backend podporuje CORS pre domény `https://zavio.cloud` a `http://localhost:3000`

5. **Error Handling:** Vždy kontrolujte status kód odpovede a spracujte chybové správy

6. **Kredity:** Pri vytváraní rezervácie sa automaticky odpočítajú kredity. Pri zrušení sa vráti plná suma.

7. **Status rezervácií:**
   - `confirmed` - Potvrdená rezervácia
   - `pending` - Čaká na potvrdenie
   - `cancelled` - Zrušená rezervácia
   - `completed` - Dokončená rezervácia
