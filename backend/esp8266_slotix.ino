/**
 * SLOTIX – Smart Parking System
 * ESP8266 (NodeMCU) Firmware for Firebase Realtime Database
 * 
 * Architecture:
 * IR Sensors → ESP8266 → Wi-Fi → Firebase Realtime Database → Slotix Dashboard
 * 
 * Hardware Wiring:
 * -------------------------------------------------------------
 * Slot S01  ->  IR Sensor 1 Out  ->  NodeMCU Pin D1 (GPIO 5)
 * Slot S02  ->  IR Sensor 2 Out  ->  NodeMCU Pin D2 (GPIO 4)
 * Slot S03  ->  IR Sensor 3 Out  ->  NodeMCU Pin D5 (GPIO 14)
 * Slot S04  ->  IR Sensor 4 Out  ->  NodeMCU Pin D6 (GPIO 12)
 * All VCC   ->  3.3V or 5V (NodeMCU 3V3 / Vin pin)
 * All GND   ->  GND (NodeMCU GND pin)
 * -------------------------------------------------------------
 * 
 * Sensor Detection Logic:
 * Active-LOW output on standard IR obstacle modules (FC-51 / LM393 / TCRT5000):
 *   - Obstacle / Car Detected : digitalRead() == LOW  (0) -> Occupied = 1
 *   - Slot Empty / Beam Clear : digitalRead() == HIGH (1) -> Occupied = 0
 * 
 * Firebase Realtime Database Setup:
 * 1. Go to Firebase Console -> Build -> Realtime Database.
 * 2. In "Rules", set read and write to true (for testing/production device access):
 *    {
 *      "rules": {
 *        ".read": true,
 *        ".write": true
 *      }
 *    }
 * 3. Copy your Database URL (e.g., "https://YOUR_PROJECT-default-rtdb.firebaseio.com")
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>

// ==============================================================
// 1. Wi-Fi Network Credentials:
// ==============================================================
const char* WIFI_SSID     = "PruthviG";
const char* WIFI_PASSWORD = "11111111";

// ==============================================================
// 2. Firebase Realtime Database URL:
// ==============================================================
// Example: "https://slotix-parking-default-rtdb.firebaseio.com"
// (Do NOT include a trailing slash)
const char* FIREBASE_HOST_URL = "https://slotix-a779f-default-rtdb.firebaseio.com";

// Optional: Firebase Database Secret / Auth Token (leave empty "" if rules allow read/write)
const char* FIREBASE_AUTH = "";

// ==============================================================
// 3. IR Sensor Digital Input Pins
// ==============================================================
const int PIN_S01 = D1; // GPIO 5  - Slot 1
const int PIN_S02 = D2; // GPIO 4  - Slot 2
const int PIN_S03 = D5; // GPIO 14 - Slot 3
const int PIN_S04 = D6; // GPIO 12 - Slot 4

// State cache to transmit updates on changes
int lastS01 = -1;
int lastS02 = -1;
int lastS03 = -1;
int lastS04 = -1;

unsigned long lastHeartbeat = 0;
const unsigned long HEARTBEAT_INTERVAL = 5000; // Heartbeat refresh every 5 seconds

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.println("\n[Wi-Fi] Connecting to Wi-Fi...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 30) {
    delay(400);
    Serial.print(".");
    retries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[Wi-Fi] Connected!");
    Serial.print("[Wi-Fi] NodeMCU IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[Wi-Fi] Connection timed out. Will retry in loop...");
  }
}

// Sends slot telemetry to Firebase Realtime Database
void sendToFirebase(bool s01Occ, bool s02Occ, bool s03Occ, bool s04Occ) {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
    if (WiFi.status() != WL_CONNECTED) return;
  }

  WiFiClientSecure client;
  client.setInsecure(); // Skip SSL certificate fingerprint validation for simple HTTPS

  HTTPClient http;

  // Build Firebase REST URL: https://<HOST>/slots.json
  String url = String(FIREBASE_HOST_URL) + "/slots.json";
  if (strlen(FIREBASE_AUTH) > 0) {
    url += "?auth=" + String(FIREBASE_AUTH);
  }

  if (!http.begin(client, url)) {
    Serial.println("[Firebase] Unable to connect to Firebase URL");
    return;
  }

  http.addHeader("Content-Type", "application/json");

  // Construct JSON payload: 1 = Occupied, 0 = Available
  String payload = "{";
  payload += "\"S01\":" + String(s01Occ ? 1 : 0) + ",";
  payload += "\"S02\":" + String(s02Occ ? 1 : 0) + ",";
  payload += "\"S03\":" + String(s03Occ ? 1 : 0) + ",";
  payload += "\"S04\":" + String(s04Occ ? 1 : 0);
  payload += "}";

  Serial.print("[Firebase TX /slots] Payload: ");
  Serial.println(payload);

  // Send PATCH request so other fields in database are preserved
  int httpCode = http.PATCH(payload);

  if (httpCode > 0) {
    Serial.printf("[Firebase] Success! HTTP Code: %d\n", httpCode);
  } else {
    Serial.printf("[Firebase] Failed! Error: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();

  // Also update heartbeat timestamp at /system.json
  updateHeartbeat(client);
}

void updateHeartbeat(WiFiClientSecure &client) {
  HTTPClient http;
  String url = String(FIREBASE_HOST_URL) + "/system.json";
  if (strlen(FIREBASE_AUTH) > 0) {
    url += "?auth=" + String(FIREBASE_AUTH);
  }

  if (http.begin(client, url)) {
    http.addHeader("Content-Type", "application/json");
    // Firebase Server Timestamp or millis timestamp
    String sysPayload = "{\"lastHeartbeat\":{\".sv\":\"timestamp\"},\"espOnline\":true}";
    http.PATCH(sysPayload);
    http.end();
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=======================================================");
  Serial.println("  SLOTIX – Smart Parking ESP8266 Firebase Client");
  Serial.println("=======================================================");

  // Configure IR sensor input pins with pull-ups for clean signal
  pinMode(PIN_S01, INPUT_PULLUP);
  pinMode(PIN_S02, INPUT_PULLUP);
  pinMode(PIN_S03, INPUT_PULLUP);
  pinMode(PIN_S04, INPUT_PULLUP);

  connectWiFi();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  // Active-LOW logic: LOW means beam is blocked by vehicle
  bool s01Occupied = (digitalRead(PIN_S01) == LOW);
  bool s02Occupied = (digitalRead(PIN_S02) == LOW);
  bool s03Occupied = (digitalRead(PIN_S03) == LOW);
  bool s04Occupied = (digitalRead(PIN_S04) == LOW);

  // Detect state change
  bool changed = (s01Occupied != lastS01) ||
                 (s02Occupied != lastS02) ||
                 (s03Occupied != lastS03) ||
                 (s04Occupied != lastS04);

  // Send update immediately on state change, or periodically as heartbeat
  if (changed || (millis() - lastHeartbeat >= HEARTBEAT_INTERVAL)) {
    sendToFirebase(s01Occupied, s02Occupied, s03Occupied, s04Occupied);

    lastS01 = s01Occupied;
    lastS02 = s02Occupied;
    lastS03 = s03Occupied;
    lastS04 = s04Occupied;
    lastHeartbeat = millis();
  }

  delay(150); // 150ms debounce
}
