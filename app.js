/**
 * SLOTIX – Smart Parking System
 * Firebase Realtime Database Dashboard Controller
 * Architecture: IR Sensors → ESP8266 → Wi-Fi → Firebase Realtime Database → Slotix Dashboard
 */

class SlotixFirebaseApp {
  constructor() {
    this.slots = [
      { id: "S01", name: "Slot 01", occupied: false, sensorId: "IR-SEN-01", pin: "D1", gpio: "GPIO 5", lastUpdated: null },
      { id: "S02", name: "Slot 02", occupied: false, sensorId: "IR-SEN-02", pin: "D2", gpio: "GPIO 4", lastUpdated: null },
      { id: "S03", name: "Slot 03", occupied: false, sensorId: "IR-SEN-03", pin: "D5", gpio: "GPIO 14", lastUpdated: null },
      { id: "S04", name: "Slot 04", occupied: false, sensorId: "IR-SEN-04", pin: "D6", gpio: "GPIO 12", lastUpdated: null }
    ];

    this.firebaseApp = null;
    this.db = null;
    this.firebaseConnected = false;
    this.espOnline = false;
    this.lastHeartbeatEpoch = null;
    this.lastPacketTime = null;
    this.soundEnabled = true;
    this.audioCtx = null;
    this.config = getFirebaseConfig();

    this.init();
  }

  init() {
    this.cacheDom();
    this.bindEvents();
    this.registerPWA();
    this.renderAll();
    this.initFirebase();
    this.startClockTicker();
  }

  cacheDom() {
    this.dom = {
      metricTotal: document.getElementById('metricTotal'),
      metricAvailable: document.getElementById('metricAvailable'),
      metricOccupied: document.getElementById('metricOccupied'),
      metricAvailablePercent: document.getElementById('metricAvailablePercent'),
      metricOccupiedPercent: document.getElementById('metricOccupiedPercent'),
      lotStatusPill: document.getElementById('lotStatusPill'),
      slotCardsContainer: document.getElementById('slotCardsContainer'),
      systemPulse: document.getElementById('systemPulse'),
      systemStatusLabel: document.getElementById('systemStatusLabel'),
      lastUpdatedLabel: document.getElementById('lastUpdatedLabel'),
      heartbeatBadge: document.getElementById('heartbeatBadge'),
      latencyTag: document.getElementById('latencyTag'),
      espStatusDot: document.getElementById('espStatusDot'),
      espStatusBannerText: document.getElementById('espStatusBannerText'),
      firebaseDbDisplay: document.getElementById('firebaseDbDisplay'),
      configFirebaseBtn: document.getElementById('configFirebaseBtn'),
      soundToggleBtn: document.getElementById('soundToggleBtn'),
      soundIconOn: document.getElementById('soundIconOn'),
      soundIconOff: document.getElementById('soundIconOff'),
      settingsBtn: document.getElementById('settingsBtn'),
      settingsModal: document.getElementById('settingsModal'),
      closeModalBtn: document.getElementById('closeModalBtn'),
      saveFirebaseBtn: document.getElementById('saveFirebaseBtn'),
      cfgDatabaseUrl: document.getElementById('cfgDatabaseUrl'),
      cfgApiKey: document.getElementById('cfgApiKey'),
      cfgProjectId: document.getElementById('cfgProjectId'),
      manualRefreshBtn: document.getElementById('manualRefreshBtn'),
      archNodeIR: document.getElementById('archNodeIR'),
      archNodeESP: document.getElementById('archNodeESP'),
      archNodeWiFi: document.getElementById('archNodeWiFi'),
      archNodeCloud: document.getElementById('archNodeCloud'),
      archNodeDash: document.getElementById('archNodeDash')
    };
  }

  bindEvents() {
    // Sound Toggle
    this.dom.soundToggleBtn.addEventListener('click', () => this.toggleSound());

    // Settings Modal
    this.dom.settingsBtn.addEventListener('click', () => this.openSettings());
    if (this.dom.configFirebaseBtn) {
      this.dom.configFirebaseBtn.addEventListener('click', () => this.openSettings());
    }
    this.dom.closeModalBtn.addEventListener('click', () => this.closeSettings());
    this.dom.settingsModal.addEventListener('click', (e) => {
      if (e.target === this.dom.settingsModal) this.closeSettings();
    });

    // Save Firebase Config
    this.dom.saveFirebaseBtn.addEventListener('click', () => this.handleSaveFirebaseConfig());

    // Manual Refresh / Sync
    this.dom.manualRefreshBtn.addEventListener('click', () => this.forceSync());

    // Browser Online/Offline
    window.addEventListener('online', () => this.updateOnlineStatus(true));
    window.addEventListener('offline', () => this.updateOnlineStatus(false));
  }

  registerPWA() {
    if ('caches' in window) {
      caches.keys().then((keys) => {
        keys.forEach((key) => {
          if (key !== 'slotix-cache-v5') caches.delete(key);
        });
      });
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').then((reg) => {
        reg.update();
      }).catch((err) => {
        console.warn('SW registration skipped:', err);
      });
    }
  }

  // Initialize Firebase Realtime Database
  initFirebase() {
    try {
      if (this.dom.firebaseDbDisplay) {
        this.dom.firebaseDbDisplay.textContent = this.config.databaseURL || 'Config required';
      }

      // Check if SDK loaded
      if (typeof firebase === 'undefined') {
        this.dom.systemStatusLabel.textContent = 'FIREBASE SDK MISSING';
        this.dom.systemStatusLabel.classList.add('offline');
        return;
      }

      // Initialize App
      if (!firebase.apps.length) {
        this.firebaseApp = firebase.initializeApp(this.config);
      } else {
        this.firebaseApp = firebase.app();
      }

      this.db = firebase.database();

      // 1. Monitor Firebase Web Client Connectivity (.info/connected)
      this.db.ref('.info/connected').on('value', (snap) => {
        const isConnected = Boolean(snap.val());
        this.firebaseConnected = isConnected;
        if (isConnected) {
          this.dom.systemPulse.classList.remove('offline');
          this.dom.systemStatusLabel.classList.remove('offline');
          this.dom.systemStatusLabel.textContent = 'FIREBASE CLOUD LIVE';
          this.dom.latencyTag.textContent = 'Cloud: Real-time';
        } else {
          this.dom.systemPulse.classList.add('offline');
          this.dom.systemStatusLabel.classList.add('offline');
          this.dom.systemStatusLabel.textContent = 'CONNECTING TO FIREBASE';
          this.dom.latencyTag.textContent = 'Connecting...';
        }
      });

      // 2. Real-Time Slot Telemetry Listener (/slots)
      this.db.ref('/slots').on('value', (snapshot) => {
        const data = snapshot.val();
        this.lastPacketTime = Date.now();
        if (data) {
          this.handleSlotsUpdate(data);
        }
      }, (error) => {
        console.error('Firebase read error on /slots:', error);
        this.dom.systemStatusLabel.textContent = 'FIREBASE AUTH ERROR';
        this.dom.systemStatusLabel.classList.add('offline');
      });

      // 3. Real-Time ESP8266 System Heartbeat Listener (/system)
      this.db.ref('/system').on('value', (snapshot) => {
        const sys = snapshot.val();
        if (sys) {
          this.handleSystemUpdate(sys);
        }
      });

    } catch (err) {
      console.error('Failed to initialize Firebase:', err);
      this.dom.systemStatusLabel.textContent = 'CONFIG ERROR';
      this.dom.systemStatusLabel.classList.add('offline');
    }
  }

  handleSlotsUpdate(data) {
    let stateChanged = false;

    // Supports:
    // 1) { S01: 1, S02: 0, S03: 0, S04: 1 } (Standard numeric 1=occupied, 0=free)
    // 2) { S01: true, S02: false } (Boolean)
    // 3) { S01: { occupied: true, lastUpdated: 1727780000000 }, ... } (Nested object)

    this.slots.forEach(slot => {
      const val = data[slot.id];
      if (val !== undefined && val !== null) {
        let isOccupied = false;
        let updateTimestamp = null;

        if (typeof val === 'object') {
          isOccupied = Boolean(val.occupied);
          updateTimestamp = val.lastUpdated || Date.now();
        } else if (typeof val === 'boolean') {
          isOccupied = val;
        } else {
          // Numbers or strings '1'/'0'
          isOccupied = (val === 1 || val === '1' || val === true);
        }

        if (slot.occupied !== isOccupied) {
          slot.occupied = isOccupied;
          slot.lastUpdated = updateTimestamp || Date.now();
          stateChanged = true;
          this.playStatusSound(slot.occupied);
        }
      }
    });

    if (stateChanged) {
      this.pulseArchPipeline();
    }

    this.renderAll();
  }

  handleSystemUpdate(sys) {
    // If heartbeat received within last 15s
    const now = Date.now();
    let isLive = false;

    if (sys.lastHeartbeat) {
      this.lastHeartbeatEpoch = typeof sys.lastHeartbeat === 'number' 
        ? sys.lastHeartbeat 
        : new Date(sys.lastHeartbeat).getTime();

      const diffSec = (now - this.lastHeartbeatEpoch) / 1000;
      isLive = diffSec < 15;
    } else if (sys.espOnline !== undefined) {
      isLive = Boolean(sys.espOnline);
    }

    this.espOnline = isLive;

    if (isLive) {
      if (this.dom.espStatusDot) this.dom.espStatusDot.className = 'esp-status-dot connected';
      if (this.dom.espStatusBannerText) this.dom.espStatusBannerText.textContent = 'ESP8266 Live on Wi-Fi (Firebase Sync)';
      this.dom.heartbeatBadge.textContent = 'ESP8266 Online';
      this.dom.heartbeatBadge.className = 'heartbeat-badge online';
    } else {
      if (this.dom.espStatusDot) this.dom.espStatusDot.className = 'esp-status-dot awaiting';
      if (this.dom.espStatusBannerText) this.dom.espStatusBannerText.textContent = 'Awaiting ESP8266 Wi-Fi Signal';
      this.dom.heartbeatBadge.textContent = 'ESP8266 Standby';
      this.dom.heartbeatBadge.className = 'heartbeat-badge';
    }
  }

  forceSync() {
    this.lastPacketTime = Date.now();
    this.pulseArchPipeline();
    if (this.db) {
      this.db.ref('/slots').once('value').then(snap => {
        const val = snap.val();
        if (val) this.handleSlotsUpdate(val);
      }).catch(err => console.warn('Manual fetch error:', err));
    }
  }

  startClockTicker() {
    setInterval(() => {
      this.updateElapsedTimers();
      this.updateHeartbeatDisplay();
    }, 1000);
  }

  updateHeartbeatDisplay() {
    if (!this.lastPacketTime) {
      this.dom.lastUpdatedLabel.textContent = 'Awaiting cloud data...';
      return;
    }

    const elapsedSec = Math.floor((Date.now() - this.lastPacketTime) / 1000);
    this.dom.lastUpdatedLabel.textContent = `Sync: ${elapsedSec}s ago`;

    // Check ESP8266 timeout
    if (this.lastHeartbeatEpoch) {
      const espDiff = Math.floor((Date.now() - this.lastHeartbeatEpoch) / 1000);
      if (espDiff > 15 && this.espOnline) {
        this.espOnline = false;
        if (this.dom.espStatusDot) this.dom.espStatusDot.className = 'esp-status-dot awaiting';
        if (this.dom.espStatusBannerText) this.dom.espStatusBannerText.textContent = 'ESP8266 Heartbeat Lost';
        this.dom.heartbeatBadge.textContent = 'ESP8266 Offline';
        this.dom.heartbeatBadge.className = 'heartbeat-badge';
      }
    }
  }

  updateElapsedTimers() {
    this.slots.forEach(slot => {
      const el = document.getElementById(`slot-time-${slot.id}`);
      if (el) {
        if (!slot.lastUpdated) {
          el.textContent = slot.occupied ? 'Occupied' : 'Available';
        } else {
          const diffMs = Date.now() - new Date(slot.lastUpdated).getTime();
          el.textContent = this.formatDuration(diffMs, slot.occupied);
        }
      }
    });
  }

  formatDuration(ms, isOccupied) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    let timeStr = "";
    if (hours > 0) {
      timeStr = `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      timeStr = `${minutes}m ${seconds}s`;
    } else {
      timeStr = `${seconds}s`;
    }

    return isOccupied ? `Parked for ${timeStr}` : `Vacant for ${timeStr}`;
  }

  renderAll() {
    this.renderMetrics();
    this.renderVisualMap();
    this.renderSlotCards();
  }

  renderMetrics() {
    const total = this.slots.length;
    const occupied = this.slots.filter(s => s.occupied).length;
    const available = total - occupied;

    const availablePercent = Math.round((available / total) * 100);
    const occupiedPercent = Math.round((occupied / total) * 100);

    this.dom.metricTotal.textContent = total;
    this.dom.metricAvailable.textContent = available;
    this.dom.metricOccupied.textContent = occupied;

    this.dom.metricAvailablePercent.textContent = `${availablePercent}% Open Capacity`;
    this.dom.metricOccupiedPercent.textContent = `${occupiedPercent}% Occupancy Rate`;

    if (available === 0) {
      this.dom.lotStatusPill.textContent = 'LOT FULL';
      this.dom.lotStatusPill.className = 'lot-status-pill full';
    } else {
      this.dom.lotStatusPill.textContent = `${available} SPACES OPEN`;
      this.dom.lotStatusPill.className = 'lot-status-pill';
    }
  }

  renderVisualMap() {
    this.slots.forEach(slot => {
      const bay = document.getElementById(`bay-${slot.id}`);
      const tag = document.getElementById(`bayTag-${slot.id}`);
      if (!bay || !tag) return;

      if (slot.occupied) {
        bay.classList.remove('available');
        bay.classList.add('occupied');
        tag.textContent = 'OCCUPIED';
      } else {
        bay.classList.remove('occupied');
        bay.classList.add('available');
        tag.textContent = 'AVAILABLE';
      }
    });
  }

  renderSlotCards() {
    if (!this.dom.slotCardsContainer) return;
    this.dom.slotCardsContainer.innerHTML = this.slots.map(slot => {
      const isOccupied = slot.occupied;
      const statusClass = isOccupied ? 'occupied' : 'available';
      const statusText = isOccupied ? 'OCCUPIED' : 'AVAILABLE';
      const beamText = isOccupied ? 'OBSTRUCTED (Car Detected)' : 'BEAM CLEAR (Slot Open)';
      const beamClass = isOccupied ? 'beam-cut' : 'beam-clear';
      const durationDisplay = slot.lastUpdated 
        ? this.formatDuration(Date.now() - new Date(slot.lastUpdated).getTime(), isOccupied)
        : (isOccupied ? 'Occupied' : 'Available');

      return `
        <div class="slot-card ${statusClass}" id="card-${slot.id}">
          <div class="slot-card-header">
            <div class="slot-title-group">
              <span class="slot-id-pill">${slot.id}</span>
              <span class="slot-state-badge">${statusText}</span>
            </div>
            <div class="slot-duration" id="slot-time-${slot.id}">
              ${durationDisplay}
            </div>
          </div>

          <!-- IR Sensor Diagnostics -->
          <div class="sensor-meta-grid">
            <div class="sensor-meta-item">
              <span class="sensor-meta-label">Sensor Unit</span>
              <span class="sensor-meta-value">${slot.sensorId}</span>
            </div>
            <div class="sensor-meta-item">
              <span class="sensor-meta-label">IR Sensor Signal</span>
              <span class="sensor-meta-value ${beamClass}">${beamText}</span>
            </div>
            <div class="sensor-meta-item">
              <span class="sensor-meta-label">NodeMCU Pin</span>
              <span class="sensor-meta-value">${slot.pin} (${slot.gpio})</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  pulseArchPipeline() {
    const nodes = [
      this.dom.archNodeIR,
      this.dom.archNodeESP,
      this.dom.archNodeWiFi,
      this.dom.archNodeCloud,
      this.dom.archNodeDash
    ];

    nodes.forEach((node, idx) => {
      if (!node) return;
      setTimeout(() => {
        node.style.transform = 'scale(1.15)';
        node.style.color = '#38bdf8';
        setTimeout(() => {
          node.style.transform = '';
          node.style.color = '';
        }, 250);
      }, idx * 80);
    });
  }

  // Acoustic Feedback
  playStatusSound(isOccupied) {
    if (!this.soundEnabled) return;

    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      if (isOccupied) {
        // Car arrived chime
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, this.audioCtx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.12, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.25);
      } else {
        // Car departed chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(580, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, this.audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.3);
      }
    } catch (e) {
      // Audio context policy
    }
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    if (this.soundEnabled) {
      this.dom.soundIconOn.classList.remove('hidden');
      this.dom.soundIconOff.classList.add('hidden');
      this.playStatusSound(false);
    } else {
      this.dom.soundIconOn.classList.add('hidden');
      this.dom.soundIconOff.classList.remove('hidden');
    }
  }

  updateOnlineStatus(isOnline) {
    if (isOnline) {
      this.dom.systemStatusLabel.textContent = 'FIREBASE CLOUD LIVE';
      this.dom.systemStatusLabel.classList.remove('offline');
      if (this.db) this.db.goOnline();
    } else {
      this.dom.systemStatusLabel.textContent = 'NETWORK OFFLINE';
      this.dom.systemStatusLabel.classList.add('offline');
      if (this.db) this.db.goOffline();
    }
  }

  openSettings() {
    this.dom.cfgDatabaseUrl.value = this.config.databaseURL || '';
    this.dom.cfgApiKey.value = this.config.apiKey || '';
    this.dom.cfgProjectId.value = this.config.projectId || '';
    this.dom.settingsModal.classList.remove('hidden');
  }

  closeSettings() {
    this.dom.settingsModal.classList.add('hidden');
  }

  handleSaveFirebaseConfig() {
    const dbUrl = this.dom.cfgDatabaseUrl.value.trim();
    const apiKey = this.dom.cfgApiKey.value.trim();
    const projId = this.dom.cfgProjectId.value.trim();

    if (!dbUrl) {
      alert('Please enter your Firebase Realtime Database URL');
      return;
    }

    const updatedConfig = {
      ...this.config,
      databaseURL: dbUrl.replace(/\/+$/, ''), // strip trailing slash
      apiKey: apiKey || this.config.apiKey,
      projectId: projId || this.config.projectId,
      authDomain: projId ? `${projId}.firebaseapp.com` : this.config.authDomain
    };

    saveFirebaseConfig(updatedConfig);
    this.config = updatedConfig;
    this.closeSettings();

    // Reload page to reinitialize Firebase with fresh credentials
    window.location.reload();
  }
}

// Instantiate on load
window.SlotixApp = new SlotixFirebaseApp();
