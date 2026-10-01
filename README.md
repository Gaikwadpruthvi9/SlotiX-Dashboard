# SLOTIX – Smart Parking System 🚗⚡

SLOTIX is a real-time IoT smart parking system powered by NodeMCU (ESP8266), IR obstacle sensors, and a dark telemetry web dashboard.

---

## 📁 Project Architecture

The codebase is organized into **`frontend/`** and **`backend/`** folders:

```text
SlotiX-Dashboard/
├── frontend/
│   ├── index.html              # Main real-time parking dashboard
│   ├── style.css               # Production dark theme & design system
│   ├── app.js                  # Frontend controller & WebSocket/Firebase sync
│   ├── firebase-config.js      # Firebase Realtime Database credentials
│   ├── manifest.webmanifest    # PWA progressive web app manifest
│   ├── sw.js                   # Service Worker for offline capability
│   ├── icons/                  # PWA and app favicon icons
│   └── images/                 # App assets & illustrations
│
├── backend/
│   ├── server.js               # Node.js HTTP & SSE real-time IoT server
│   ├── esp8266_slotix.ino      # NodeMCU Arduino firmware for IR sensors
│   └── package.json            # Backend dependencies & scripts
│
├── package.json                # Root convenience scripts
├── .gitignore
└── README.md
```

---

## 🚀 Quick Start

### 1. Run with Node.js Server
From the project root:
```bash
npm start
```
Or from the `backend/` directory:
```bash
cd backend
node server.js
```

The server will automatically serve the frontend at:
- **Local Dashboard:** `http://localhost:3000`
- **Network Dashboard:** `http://<your-local-ip>:3000`
- **ESP8266 Endpoint:** `http://<your-local-ip>:3000/api/update`

### 2. Run with Live Server
Open `frontend/index.html` in VS Code with Live Server (typically on port `5500`).

---

## ⚡ Hardware Integration (ESP8266 + IR Sensors)

- **Microcontroller**: NodeMCU ESP8266 (v2 / v3)
- **Sensors**: 4× IR Obstacle Detection Sensors
- **Pin Mapping**:
  - Slot 01: `D1` (GPIO 5)
  - Slot 02: `D2` (GPIO 4)
  - Slot 03: `D5` (GPIO 14)
  - Slot 04: `D6` (GPIO 12)
- **Firmware**: Open [backend/esp8266_slotix.ino](backend/esp8266_slotix.ino) in Arduino IDE, set your Wi-Fi credentials, and flash to your board.

---

## 🛠 Features

- **Live Cloud Sync**: Seamless Firebase Realtime Database & SSE event streaming.
- **Dynamic 2x2 Blueprint Map**: Instant vacant/occupied status toggling with audible chimes.
- **KPI Metrics**: Total capacity, real-time available bays, and occupancy rate tracking.
- **PWA Ready**: Installable as a standalone progressive web application.
