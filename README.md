# SLOTIX – Smart Parking System 🚗🅿️ (Firebase Cloud Edition)

A modern, cloud-connected mobile-first real-time smart parking dashboard powered by **IR Sensors**, **ESP8266 (NodeMCU)**, and **Firebase Realtime Database**.

---

## 🏗️ Production Cloud Architecture

```
[4x IR Sensors] ──(GPIO)──> [ESP8266 NodeMCU] ──(Wi-Fi HTTPS)──> [Firebase Realtime Database] ──(WebSocket)──> [Slotix Mobile Dashboard]
```

- **Global Access**: Accessible from anywhere in the world on any smartphone, tablet, or laptop.
- **Zero Local Server Dependency**: No localhost or laptop IP needed in production.
- **Instant Real-Time Sync**: Firebase Realtime Database pushes state updates via WebSockets in milliseconds.

---

## ⚡ Features

- **4 Parking Slots (S01, S02, S03, S04)**: Live individual cards with hardware telemetry.
- **Top KPI Metrics**:
  - Total Slots (4 Bays)
  - Available Slots (Neon Green `#10b981`)
  - Occupied Slots (Crimson Red `#ef4444`)
  - Live Capacity % and Occupancy Rate
- **Visual Parking Area Layout**:
  - 2×2 parking bay layout with entrance drive aisle & exit corridor
  - Real-time car graphic on occupied bays, glowing green target on available bays
- **IR Sensor Telemetry**:
  - NodeMCU GPIO mapping (D1, D2, D5, D6)
  - Sensor beam status (`OBSTRUCTED` vs `BEAM CLEAR`)
  - Dynamic elapsed time counters (`Parked for 12m 30s` / `Vacant for 4m`)
- **System & Heartbeat Indicator**:
  - Real-time ESP8266 Wi-Fi connection detection via `/system/lastHeartbeat`
  - Acoustic chime feedback on vehicle arrival/departure
- **PWA-Ready**:
  - Installable directly to mobile home screen (iOS & Android) with offline asset caching.

---

## 🔌 Hardware Pinout Wiring

| Slot | IR Sensor | NodeMCU (ESP8266) Pin | GPIO Pin | Detection Logic |
| :--- | :--- | :--- | :--- | :--- |
| **S01** | Sensor 1 Out | **D1** | GPIO 5 | `LOW (0)` = Occupied, `HIGH (1)` = Available |
| **S02** | Sensor 2 Out | **D2** | GPIO 4 | `LOW (0)` = Occupied, `HIGH (1)` = Available |
| **S03** | Sensor 3 Out | **D5** | GPIO 14 | `LOW (0)` = Occupied, `HIGH (1)` = Available |
| **S04** | Sensor 4 Out | **D6** | GPIO 12 | `LOW (0)` = Occupied, `HIGH (1)` = Available |
| **VCC** | All Sensors | **3V3 or Vin** | — | 3.3V or 5V Power |
| **GND** | All Sensors | **GND** | — | Common Ground |

---

## 🔥 Firebase Setup Guide (3 Minutes)

### Step 1: Create Firebase Realtime Database
1. Go to [Firebase Console](https://console.firebase.google.com/) and create a project (e.g. `slotix-parking`).
2. Navigate to **Build → Realtime Database** and click **Create Database**.
3. Select your location and start in **Test mode**.
4. In the **Rules** tab, ensure read and write permissions are enabled:
   ```json
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
   ```
5. Copy your **Database URL** from the top:
   `https://YOUR_PROJECT-default-rtdb.firebaseio.com`

---

### Step 2: Configure Web Dashboard
Open [`firebase-config.js`](file:///c:/Users/gaikw/OneDrive/Desktop/Slotex/firebase-config.js) and paste your Firebase details:
```javascript
const DEFAULT_FIREBASE_CONFIG = {
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  apiKey: "YOUR_API_KEY",
  projectId: "YOUR_PROJECT_ID"
};
```
*(You can also click the ⚙️ **Settings** icon on the dashboard to paste and save your credentials directly in the browser!)*

---

### Step 3: Flash ESP8266 NodeMCU
1. Open [`esp8266_slotix.ino`](file:///c:/Users/gaikw/OneDrive/Desktop/Slotex/esp8266_slotix.ino) in Arduino IDE.
2. Update your Wi-Fi credentials and Firebase URL:
   ```cpp
   const char* WIFI_SSID     = "YOUR_WIFI_NAME";
   const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
   const char* FIREBASE_HOST_URL = "https://YOUR_PROJECT-default-rtdb.firebaseio.com";
   ```
3. Connect your NodeMCU board via USB, select **NodeMCU 1.0 (ESP-12E Module)** in Arduino IDE, and click **Upload**.
4. Open the Serial Monitor at **115200 baud** to see real-time Wi-Fi connection and telemetry transmissions!

---

## 🌐 Deploying Dashboard for Global Mobile Access

Because the dashboard now directly connects to Firebase over HTTPS and WebSockets, you can host it anywhere for free:

### Option A: Firebase Hosting (Recommended)
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

### Option B: GitHub Pages / Vercel / Netlify
Simply push this folder to a GitHub repository and enable **GitHub Pages** (Settings → Pages → Branch: main). You will get a free HTTPS link like:
`https://yourusername.github.io/Slotex/`
Open that link on any smartphone anywhere in the world!
