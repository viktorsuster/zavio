# QR Kód Skenovanie - Mobilná Appka

Tento dokument popisuje, ako má mobilná appka spracovať naskenovaný QR kód ihriska.

---

## Postup skenovania QR kódu

### 1. Naskenovanie QR kódu

Používateľ naskenuje QR kód pomocou kamery v mobilnej appke.

**Formát QR kódu:**

```
https://sportvia.cloud/qr/FIELD-8B08E0DB
```

QR kód obsahuje web URL s UUID ihriska na konci.

---

### 2. Extrahovanie UUID

Z naskenovaného linku musíte extrahovať UUID (posledná časť URL).

**Príklad:**

```javascript
// Naskenovaný link
const qrLink = "https://sportvia.cloud/qr/FIELD-8B08E0DB";

// Extrahujte UUID
const qrCodeId = qrLink.split("/").pop();
// Výsledok: 'FIELD-8B08E0DB'
```

**Alebo pomocou URL parsera:**

```javascript
const url = new URL(qrLink);
const qrCodeId = url.pathname.split("/").pop();
// Výsledok: 'FIELD-8B08E0DB'
```

---

### 3. Poslanie requestu na backend

Po extrahovaní UUID pošlite GET request na backend endpoint.

**Endpoint:**

```
GET https://app.sportvia.cloud/api/mobile/qr/{qrCodeId}
```

**Headers:**

```
Authorization: Bearer {JWT_TOKEN}
```

**Príklad s fetch:**

```javascript
const qrCodeId = "FIELD-8B08E0DB";
const token = await AsyncStorage.getItem("user_token"); // alebo z iného úložiska

const response = await fetch(
  `https://app.sportvia.cloud/api/mobile/qr/${qrCodeId}`,
  {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  }
);

const data = await response.json();
```

**Príklad s axios:**

```javascript
import axios from "axios";

const qrCodeId = "FIELD-8B08E0DB";
const token = await AsyncStorage.getItem("user_token");

const response = await axios.get(
  `https://app.sportvia.cloud/api/mobile/qr/${qrCodeId}`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

const data = response.data;
```

---

## Response - Prístup povolený (accessGranted: true)

Ak má používateľ aktívnu rezerváciu pre dané ihrisko v aktuálnom čase (±15 minút tolerancia):

**Status kód:** `200 OK`

**Response body:**

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

**Čo má appka urobiť:**

- Zobraziť úspešnú správu: "Ihrisko je odomknuté. Môžete vstúpiť."
- Zobraziť informácie o ihrisku (názov, typ, lokácia)
- Možno navigovať na obrazovku úspechu alebo odomknúť dvere (ak je to smart lock)
- Zobraziť zelenú farbu alebo checkmark ikonu

**Príklad UI:**

```javascript
if (data.accessGranted) {
  Alert.alert("Úspech ✅", data.message, [{ text: "OK" }]);
  // Navigujte na obrazovku úspechu
  navigation.navigate("AccessGranted", {
    field: data.field,
    booking: data.booking,
  });
}
```

---

## Response - Prístup zamietnutý (accessGranted: false)

Ak používateľ nemá aktívnu rezerváciu pre dané ihrisko v aktuálnom čase:

**Status kód:** `200 OK` (stále 200, len `accessGranted` je `false`)

**Response body:**

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

**Čo má appka urobiť:**

- Zobraziť chybovú správu: "Nemáte aktívnu rezerváciu pre toto ihrisko v tomto čase."
- Zobraziť informácie o ihrisku (aby používateľ vedel, čo skenoval)
- Možno ponúknuť vytvorenie rezervácie alebo zobrazenie dostupných časov
- Zobraziť červenú farbu alebo X ikonu

**Príklad UI:**

```javascript
if (!data.accessGranted) {
  Alert.alert("Prístup zamietnutý ❌", data.message, [
    { text: "Zrušiť", style: "cancel" },
    {
      text: "Vytvoriť rezerváciu",
      onPress: () =>
        navigation.navigate("BookField", { fieldId: data.field.id }),
    },
  ]);
}
```

---

## Chybové odpovede

### 401 Unauthorized - Neplatný token

**Status kód:** `401`

**Response:**

```json
{
  "message": "Unauthorized. Invalid token."
}
```

**Čo má appka urobiť:**

- Presmerovať používateľa na prihlasovaciu obrazovku
- Zobraziť správu: "Musíte byť prihlásený"

```javascript
if (response.status === 401) {
  Alert.alert("Chyba", "Musíte byť prihlásený");
  navigation.navigate("Login");
}
```

---

### 404 Not Found - Ihrisko neexistuje

**Status kód:** `404`

**Response:**

```json
{
  "message": "Ihrisko nebolo nájdené.",
  "accessGranted": false
}
```

**Čo má appka urobiť:**

- Zobraziť chybovú správu: "Ihrisko nebolo nájdené. Skontrolujte, či je QR kód platný."

```javascript
if (response.status === 404) {
  Alert.alert(
    "Chyba",
    "Ihrisko nebolo nájdené. Skontrolujte, či je QR kód platný."
  );
}
```

---

### 500 Internal Server Error

**Status kód:** `500`

**Response:**

```json
{
  "message": "Chyba pri validácii QR kódu.",
  "accessGranted": false
}
```

**Čo má appka urobiť:**

- Zobraziť všeobecnú chybovú správu
- Možno ponúknuť opakovanie skenovania

```javascript
if (response.status === 500) {
  Alert.alert("Chyba", "Nastala chyba pri validácii QR kódu. Skúste to znova.");
}
```

---

## Kompletný príklad (React Native)

```javascript
import React, { useState } from "react";
import { View, Text, Alert, ActivityIndicator } from "react-native";
import { BarCodeScanner } from "expo-barcode-scanner";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const QRScannerScreen = ({ navigation }) => {
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleQRCodeScanned = async ({ data }) => {
    if (scanning || loading) return;

    setScanning(true);
    setLoading(true);

    try {
      // 1. Extrahujte UUID z linku
      let qrCodeId;
      try {
        const url = new URL(data);
        qrCodeId = url.pathname.split("/").pop();
      } catch (e) {
        // Ak to nie je URL, skúste to ako priamy UUID
        qrCodeId = data.split("/").pop();
      }

      if (!qrCodeId) {
        Alert.alert("Chyba", "Neplatný QR kód");
        setScanning(false);
        setLoading(false);
        return;
      }

      // 2. Získajte token
      const token = await AsyncStorage.getItem("user_token");
      if (!token) {
        Alert.alert("Chyba", "Musíte byť prihlásený");
        navigation.navigate("Login");
        setScanning(false);
        setLoading(false);
        return;
      }

      // 3. Pošlite request
      const response = await axios.get(
        `https://app.sportvia.cloud/api/mobile/qr/${qrCodeId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = response.data;

      // 4. Spracujte odpoveď
      if (result.accessGranted) {
        // Úspech
        Alert.alert("Úspech ✅", result.message, [
          {
            text: "OK",
            onPress: () => {
              navigation.navigate("AccessGranted", {
                field: result.field,
                booking: result.booking,
              });
            },
          },
        ]);
      } else {
        // Prístup zamietnutý
        Alert.alert("Prístup zamietnutý ❌", result.message, [
          { text: "Zrušiť", style: "cancel" },
          {
            text: "Vytvoriť rezerváciu",
            onPress: () => {
              navigation.navigate("BookField", { fieldId: result.field.id });
            },
          },
        ]);
      }
    } catch (error) {
      // Spracovanie chýb
      if (error.response) {
        if (error.response.status === 401) {
          Alert.alert("Chyba", "Musíte byť prihlásený");
          navigation.navigate("Login");
        } else if (error.response.status === 404) {
          Alert.alert("Chyba", "Ihrisko nebolo nájdené");
        } else {
          Alert.alert("Chyba", error.response.data?.message || "Nastala chyba");
        }
      } else {
        Alert.alert("Chyba", "Nastala chyba pri komunikácii so serverom");
      }
    } finally {
      setScanning(false);
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <BarCodeScanner
        onBarCodeScanned={scanning ? undefined : handleQRCodeScanned}
        style={{ flex: 1 }}
      />
      {loading && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        >
          <ActivityIndicator size="large" color="#fff" />
          <Text style={{ color: "#fff", marginTop: 10 }}>
            Kontrolujem prístup...
          </Text>
        </View>
      )}
    </View>
  );
};

export default QRScannerScreen;
```

---

## Dôležité poznámky

1. **Tolerancia času:** Backend kontroluje rezerváciu s toleranciou ±15 minút. To znamená, že ak máte rezerváciu 14:00-15:00, môžete naskenovať QR kód medzi 13:45 a 15:15.

2. **Vždy 200 OK:** Endpoint vždy vráti `200 OK`, ale `accessGranted` bude `true` alebo `false`. To znamená, že musíte kontrolovať `accessGranted` v response, nie len status kód.

3. **Autentifikácia:** Endpoint vyžaduje JWT token. Uistite sa, že používateľ je prihlásený pred skenovaním.

4. **QR kód formát:** QR kódy obsahujú web URL. Ak používateľ otvorí link v prehliadači, môže byť presmerovaný na web stránku. Mobilná appka by mala rozpoznať tento formát a extrahovať UUID.

5. **Status rezervácie:** Po úspešnom prístupe sa rezervácia automaticky označí ako `checked_in` na backende. Nemusíte to riešiť v appke.

---

## Flow diagram

```
1. Používateľ naskenuje QR kód
   ↓
2. Appka extrahuje UUID z linku
   ↓
3. Appka pošle GET request s JWT tokenom
   ↓
4. Backend skontroluje rezerváciu
   ↓
5a. Má rezerváciu → accessGranted: true → Zobraz úspech
5b. Nemá rezerváciu → accessGranted: false → Zobraz chybu
```

---

## Testovanie

Pre testovanie môžete použiť tieto UUID:

- `FIELD-8B08E0DB` (príklad UUID)
- Skutočné UUID z vašich ihrísk v databáze

**Testovanie bez skutočného QR kódu:**

```javascript
// Môžete manuálne testovať s UUID
const testQRCodeId = "FIELD-8B08E0DB";
// Použite tento UUID namiesto skenovania
```
