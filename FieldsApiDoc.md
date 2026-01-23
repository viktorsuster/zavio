# Frontend API - Získanie športovísk

## GET /api/mobile/fields

Endpoint pre získanie zoznamu všetkých aktívnych športovísk (ihriská) s informáciami o vlastníkovi.

### Základné informácie

- **URL**: `https://app.sportvia.cloud/api/mobile/fields`
- **Metóda**: `GET`
- **Autentifikácia**: Nie je potrebná (public endpoint)
- **Content-Type**: `application/json`

### Request

**Headers:**

```
Content-Type: application/json
```

**Body:**
Žiadne (GET request)

**Príklad requestu:**

```javascript
fetch("https://app.sportvia.cloud/api/mobile/fields", {
  method: "GET",
  headers: {
    "Content-Type": "application/json",
  },
});
```

**Príklad s axios:**

```javascript
import axios from "axios";

const response = await axios.get(
  "https://app.sportvia.cloud/api/mobile/fields"
);
```

### Response

**Úspešná odpoveď (200 OK):**

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
    },
    {
      "id": 2,
      "name": "Padel Aréna 1",
      "type": "Padel",
      "location": "Športpark Ružinov",
      "pricePerSlot": 12.0,
      "imageUrl": "https://example.com/padel.jpg",
      "status": "active",
      "qrCodeId": "FIELD-A1B2C3D4",
      "createdAt": "2025-12-11T15:00:00.000Z",
      "owner": {
        "id": 2,
        "facilityName": "Padel Centrum",
        "contactName": "Peter Kováč",
        "phone": "+421 901 234 567"
      }
    }
  ],
  "count": 2
}
```

### Response Fields

#### Root Object

- `fields` (array) - Zoznam športovísk
- `count` (number) - Počet vrátených športovísk

#### Field Object

- `id` (number) - Unikátne ID ihriska
- `name` (string) - Názov ihriska
- `type` (string) - Typ športu (`Tenis`, `Padel`, `Futbal`, `Basketbal`)
- `location` (string) - Adresa/lokalita ihriska
- `pricePerSlot` (number) - Cena za slot v EUR
- `imageUrl` (string | null) - URL adresa obrázka ihriska
- `status` (string) - Status ihriska (`active` - len aktívne ihriská sú vrátené)
- `qrCodeId` (string) - Unikátny QR kód identifikátor (napr. `FIELD-8B08E0DB`)
- `createdAt` (string) - Dátum vytvorenia (ISO 8601 format)
- `owner` (object) - Informácie o vlastníkovi

#### Owner Object

- `id` (number) - ID vlastníka
- `facilityName` (string) - Názov športoviska
- `contactName` (string) - Meno kontaktnej osoby
- `phone` (string | null) - Telefónne číslo

### Error Responses

**500 Internal Server Error:**

```json
{
  "message": "Error fetching fields."
}
```

### Príklady použitia

#### React Native / JavaScript

```javascript
const fetchFields = async () => {
  try {
    const response = await fetch(
      "https://app.sportvia.cloud/api/mobile/fields"
    );
    const data = await response.json();

    if (response.ok) {
      console.log(`Našlo sa ${data.count} športovísk`);
      data.fields.forEach((field) => {
        console.log(`${field.name} - ${field.owner.facilityName}`);
      });
      return data.fields;
    } else {
      console.error("Chyba:", data.message);
      return [];
    }
  } catch (error) {
    console.error("Network error:", error);
    return [];
  }
};
```

#### TypeScript Interface

```typescript
interface Owner {
  id: number;
  facilityName: string;
  contactName: string;
  phone: string | null;
}

interface Field {
  id: number;
  name: string;
  type: "Tenis" | "Padel" | "Futbal" | "Basketbal";
  location: string;
  pricePerSlot: number;
  imageUrl: string | null;
  status: "active";
  qrCodeId: string;
  createdAt: string;
  owner: Owner;
}

interface FieldsResponse {
  fields: Field[];
  count: number;
}
```

#### React Hook Example

```typescript
import { useState, useEffect } from "react";

const useFields = () => {
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFields = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          "https://app.sportvia.cloud/api/mobile/fields"
        );
        const data: FieldsResponse = await response.json();

        if (response.ok) {
          setFields(data.fields);
          setError(null);
        } else {
          setError(data.message || "Chyba pri načítaní športovísk");
        }
      } catch (err) {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    };

    fetchFields();
  }, []);

  return { fields, loading, error };
};
```

### Dôležité poznámky

1. **Len aktívne ihriská**: Endpoint vracia len ihriská so statusom `active`. Ihriská v údržbe (`maintenance`) nie sú zahrnuté.

2. **Zoradenie**: Ihriská sú zoradené podľa dátumu vytvorenia (najnovšie prvé).

3. **Image URL**: Pole `imageUrl` môže byť `null` ak ihrisko nemá nastavený obrázok.

4. **QR Code ID**: `qrCodeId` sa používa na validáciu vstupu cez QR kód scanner v mobilnej aplikácii.

5. **CORS**: Endpoint podporuje CORS pre domény `https://sportvia.cloud`, `https://app.sportvia.cloud` a `http://localhost:3000`.

### Filtrovanie a vyhľadávanie

Aktuálne endpoint nevracia možnosti filtrovania. Filtrovanie podľa typu športu, lokality alebo ceny musí byť implementované na frontend strane.

**Príklad filtrovania na frontend:**

```javascript
// Filtrovanie podľa typu
const tennisFields = fields.filter((field) => field.type === "Tenis");

// Filtrovanie podľa ceny (napr. do 20 EUR)
const affordableFields = fields.filter((field) => field.pricePerSlot <= 20);

// Vyhľadávanie podľa názvu alebo lokality
const searchTerm = "centrum";
const searchResults = fields.filter(
  (field) =>
    field.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    field.location.toLowerCase().includes(searchTerm.toLowerCase())
);
```
