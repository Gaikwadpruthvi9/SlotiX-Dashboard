/**
 * SLOTIX – Smart Parking System Backend Server
 * Real-time Production IoT API for ESP8266 + Mobile Dashboard
 * 
 * Architecture: IR Sensors → ESP8266 → Backend API (this server) → Mobile Dashboard
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3000;

// Helper to find local Wi-Fi / LAN IP
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const k in interfaces) {
    for (const k2 of interfaces[k]) {
      if (k2.family === 'IPv4' && !k2.internal) {
        addresses.push(k2.address);
      }
    }
  }
  return addresses.length > 0 ? addresses : ['127.0.0.1'];
}

const localIps = getLocalIpAddresses();
const primaryIp = localIps[0] || '127.0.0.1';

// Real Hardware State Store
const parkingState = {
  espConnected: false,
  lastHeartbeat: null,
  lastUpdateEpoch: null,
  slots: [
    {
      id: "S01",
      name: "Slot 01",
      occupied: false,
      sensorId: "IR-SEN-01",
      pin: "D1",
      gpio: "GPIO 5",
      lastUpdated: new Date().toISOString()
    },
    {
      id: "S02",
      name: "Slot 02",
      occupied: false,
      sensorId: "IR-SEN-02",
      pin: "D2",
      gpio: "GPIO 4",
      lastUpdated: new Date().toISOString()
    },
    {
      id: "S03",
      name: "Slot 03",
      occupied: false,
      sensorId: "IR-SEN-03",
      pin: "D5",
      gpio: "GPIO 14",
      lastUpdated: new Date().toISOString()
    },
    {
      id: "S04",
      name: "Slot 04",
      occupied: false,
      sensorId: "IR-SEN-04",
      pin: "D6",
      gpio: "GPIO 12",
      lastUpdated: new Date().toISOString()
    }
  ]
};

// MIME types for static files
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.webmanifest': 'application/manifest+json; charset=UTF-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

// SSE active client connections
const sseClients = new Set();

function broadcastSSE(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

// Check ESP8266 timeout every 3 seconds (if no packet in 12s, mark as awaiting signal)
setInterval(() => {
  if (parkingState.lastUpdateEpoch) {
    const elapsedSec = (Date.now() - parkingState.lastUpdateEpoch) / 1000;
    const isNowConnected = elapsedSec < 12;
    if (parkingState.espConnected !== isNowConnected) {
      parkingState.espConnected = isNowConnected;
      broadcastSSE(getSnapshot());
    }
  }
}, 3000);

function getSnapshot() {
  const total = parkingState.slots.length;
  const occupied = parkingState.slots.filter(s => s.occupied).length;
  return {
    espConnected: parkingState.espConnected,
    lastHeartbeat: parkingState.lastHeartbeat,
    totalSlots: total,
    availableSlots: total - occupied,
    occupiedSlots: occupied,
    slots: parkingState.slots,
    serverIp: primaryIp,
    serverPort: PORT,
    espEndpoint: `http://${primaryIp}:${PORT}/api/update`
  };
}

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // 1. SSE Real-Time Event Stream (/api/events)
  if (pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    // Send immediate snapshot upon connection
    res.write(`data: ${JSON.stringify(getSnapshot())}\n\n`);
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  // 2. GET /api/info - Network & Hardware Connection Info
  if (pathname === '/api/info' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      serverIp: primaryIp,
      allIps: localIps,
      port: PORT,
      espEndpoint: `http://${primaryIp}:${PORT}/api/update`,
      espConnected: parkingState.espConnected,
      lastHeartbeat: parkingState.lastHeartbeat
    }));
    return;
  }

  // 3. GET /api/slots - Fetch slot states
  if (pathname === '/api/slots' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getSnapshot()));
    return;
  }

  // 4. GET /api/status - System Health Check
  if (pathname === '/api/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getSnapshot()));
    return;
  }

  // 5. POST /api/update - Real IR Sensor triggers from ESP8266
  if (pathname === '/api/update' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const now = new Date();
        parkingState.lastHeartbeat = now.toISOString();
        parkingState.lastUpdateEpoch = Date.now();
        parkingState.espConnected = true;

        // Support formats:
        // Format A: { "slot": "S01", "occupied": true }
        // Format B: { "S01": 1, "S02": 0, "S03": 0, "S04": 1 }
        // Format C: [ { "id": "S01", "occupied": true }, ... ]

        if (payload.slot) {
          const target = parkingState.slots.find(s => s.id === payload.slot);
          if (target) {
            target.occupied = Boolean(payload.occupied);
            target.lastUpdated = now.toISOString();
          }
        } else if (Array.isArray(payload)) {
          payload.forEach(item => {
            const target = parkingState.slots.find(s => s.id === item.id);
            if (target && item.occupied !== undefined) {
              target.occupied = Boolean(item.occupied);
              target.lastUpdated = now.toISOString();
            }
          });
        } else {
          // Object key-value mapping { S01: 1, S02: 0, S03: 0, S04: 1 }
          Object.keys(payload).forEach(slotId => {
            const target = parkingState.slots.find(s => s.id === slotId);
            if (target) {
              // 0 or false = Available, 1 or true = Occupied
              target.occupied = payload[slotId] === 1 || payload[slotId] === true || payload[slotId] === '1';
              target.lastUpdated = now.toISOString();
            }
          });
        }

        // Instant push to all dashboard screens in real time
        broadcastSSE(getSnapshot());

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, timestamp: now.toISOString(), data: getSnapshot() }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: "Invalid JSON payload", details: err.message }));
      }
    });
    return;
  }

  // 6. Static file serving (PWA assets from frontend folder)
  const frontendDir = fs.existsSync(path.join(__dirname, '..', 'frontend')) 
    ? path.join(__dirname, '..', 'frontend') 
    : __dirname;
  let normalizedPath = pathname;
  if (normalizedPath === '/' || normalizedPath === '/index') {
    normalizedPath = 'index.html';
  } else if (normalizedPath === '/login') {
    normalizedPath = 'login.html';
  } else if (normalizedPath === '/select') {
    normalizedPath = 'select.html';
  }
  let filePath = path.join(frontendDir, normalizedPath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(frontendDir, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      }
    });
  });
});

// Bind to 0.0.0.0 so ESP8266 on local Wi-Fi can connect
server.listen(PORT, '0.0.0.0', () => {
  console.log(`=============================================================`);
  console.log(`  SLOTIX – Smart Parking System Real-Time IoT Server`);
  console.log(`  Local Web Dashboard: http://localhost:${PORT}`);
  console.log(`  Network Web Dashboard: http://${primaryIp}:${PORT}`);
  console.log(`  -----------------------------------------------------------`);
  console.log(`  ESP8266 HTTP POST Endpoint:`);
  console.log(`  >>> http://${primaryIp}:${PORT}/api/update <<<`);
  console.log(`=============================================================`);
});
