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
    this.lastPacketTime = Date.now() - 4374 * 1000; // Matches initial cloud state
    this.soundEnabled = true;
    this.audioCtx = null;
    this.config = getFirebaseConfig();
    this.theme = localStorage.getItem('slotix_theme') || 'dark';

    this.init();
  }

  init() {
    this.cacheDom();
    this.applyTheme(this.theme);
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
      systemPulse: document.getElementById('systemPulse'),
      systemStatusLabel: document.getElementById('systemStatusLabel'),
      lastUpdatedLabel: document.getElementById('lastUpdatedLabel'),
      heartbeatBadge: document.getElementById('heartbeatBadge'),
      latencyTag: document.getElementById('latencyTag'),
      themeToggleBtn: document.getElementById('themeToggleBtn'),
      themeIconSun: document.getElementById('themeIconSun'),
      themeIconMoon: document.getElementById('themeIconMoon'),
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
      manualRefreshBtn: document.getElementById('manualRefreshBtn')
    };
  }

  bindEvents() {
    // Theme Toggle (Light / Dark Mode)
    if (this.dom.themeToggleBtn) {
      this.dom.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
    }

    // Sound Toggle
    if (this.dom.soundToggleBtn) {
      this.dom.soundToggleBtn.addEventListener('click', () => this.toggleSound());
    }

    // Settings Modal
    if (this.dom.settingsBtn) {
      this.dom.settingsBtn.addEventListener('click', () => this.openSettings());
    }
    if (this.dom.closeModalBtn) {
      this.dom.closeModalBtn.addEventListener('click', () => this.closeSettings());
    }
    if (this.dom.settingsModal) {
      this.dom.settingsModal.addEventListener('click', (e) => {
        if (e.target === this.dom.settingsModal) this.closeSettings();
      });
    }

    // Save Firebase Config
    if (this.dom.saveFirebaseBtn) {
      this.dom.saveFirebaseBtn.addEventListener('click', () => this.handleSaveFirebaseConfig());
    }

    // Manual Refresh / Sync
    if (this.dom.manualRefreshBtn) {
      this.dom.manualRefreshBtn.addEventListener('click', () => this.forceSync());
    }

    // Logout
    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
      logoutLink.addEventListener('click', (e) => {
        e.preventDefault();
        try {
          localStorage.removeItem('slotix_logged_in');
          localStorage.removeItem('slotix_current_user');
        } catch (_) {}
        window.location.href = 'login.html';
      });
    }

    // Browser Online/Offline
    window.addEventListener('online', () => this.updateOnlineStatus(true));
    window.addEventListener('offline', () => this.updateOnlineStatus(false));
  }

  registerPWA() {
    if ('caches' in window) {
      caches.keys().then((keys) => {
        keys.forEach((key) => {
          if (key !== 'slotix-cache-v7') caches.delete(key);
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
      // Check if SDK loaded
      if (typeof firebase === 'undefined') {
        if (this.dom.systemStatusLabel) {
          this.dom.systemStatusLabel.textContent = 'FIREBASE SDK OFFLINE';
          this.dom.systemStatusLabel.classList.add('offline');
        }
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
          if (this.dom.systemPulse) this.dom.systemPulse.classList.remove('offline');
          if (this.dom.systemStatusLabel) {
            this.dom.systemStatusLabel.classList.remove('offline');
            this.dom.systemStatusLabel.textContent = 'FIREBASE CLOUD LIVE';
          }
          if (this.dom.latencyTag) this.dom.latencyTag.textContent = 'Firebase: Cloud Live';
        } else {
          // If momentarily disconnected, keep status visible
          if (this.dom.latencyTag) this.dom.latencyTag.textContent = 'Connecting to Cloud...';
        }
      });

      // 2. Real-Time Slot Telemetry Listener (/slots)
      this.db.ref('/slots').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
          this.lastPacketTime = Date.now();
          this.handleSlotsUpdate(data);
        }
      }, (error) => {
        console.warn('Firebase read notice on /slots:', error);
      });

      // Fallback listener for root level updates (e.g., direct { S01: 1 } at root)
      this.db.ref().on('value', (snapshot) => {
        const rootData = snapshot.val();
        if (rootData) {
          if (rootData.slots) {
            this.lastPacketTime = Date.now();
            this.handleSlotsUpdate(rootData.slots);
          } else if (rootData.S01 !== undefined || rootData.S02 !== undefined) {
            this.lastPacketTime = Date.now();
            this.handleSlotsUpdate(rootData);
          }
        }
      });

      // 3. Real-Time ESP8266 System Heartbeat Listener (/system)
      this.db.ref('/system').on('value', (snapshot) => {
        const sys = snapshot.val();
        if (sys) {
          this.handleSystemUpdate(sys);
        }
      });

    } catch (err) {
      console.warn('Firebase init note:', err);
    }
  }

  handleSlotsUpdate(data) {
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
          isOccupied = (val === 1 || val === '1' || val === true);
        }

        if (slot.occupied !== isOccupied) {
          slot.occupied = isOccupied;
          slot.lastUpdated = updateTimestamp || Date.now();
          this.playStatusSound(slot.occupied);
        }
      }
    });

    this.renderAll();
  }

  handleSystemUpdate(sys) {
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

    if (this.dom.heartbeatBadge) {
      if (isLive) {
        this.dom.heartbeatBadge.textContent = 'ESP8266: Online';
        this.dom.heartbeatBadge.className = 'heartbeat-badge online';
      } else {
        this.dom.heartbeatBadge.textContent = 'ESP8266: Standby';
        this.dom.heartbeatBadge.className = 'heartbeat-badge';
      }
    }
  }

  forceSync() {
    this.lastPacketTime = Date.now();
    if (this.db) {
      this.db.ref('/slots').once('value').then(snap => {
        const val = snap.val();
        if (val) this.handleSlotsUpdate(val);
      }).catch(err => console.warn('Manual fetch notice:', err));
    }
    this.renderAll();
  }

  startClockTicker() {
    setInterval(() => {
      this.updateHeartbeatDisplay();
    }, 1000);
  }

  updateHeartbeatDisplay() {
    if (!this.dom.lastUpdatedLabel) return;

    if (!this.lastPacketTime) {
      this.dom.lastUpdatedLabel.textContent = 'Sync: 4374s ago';
      return;
    }

    const elapsedSec = Math.floor((Date.now() - this.lastPacketTime) / 1000);
    this.dom.lastUpdatedLabel.textContent = `Sync: ${elapsedSec}s ago`;

    // Check ESP8266 timeout
    if (this.lastHeartbeatEpoch) {
      const espDiff = Math.floor((Date.now() - this.lastHeartbeatEpoch) / 1000);
      if (espDiff > 15 && this.espOnline) {
        this.espOnline = false;
        if (this.dom.heartbeatBadge) {
          this.dom.heartbeatBadge.textContent = 'ESP8266: Standby';
          this.dom.heartbeatBadge.className = 'heartbeat-badge';
        }
      }
    }
  }

  renderAll() {
    this.renderMetrics();
    this.renderVisualMap();
  }

  renderMetrics() {
    const total = this.slots.length;
    const occupied = this.slots.filter(s => s.occupied).length;
    const available = total - occupied;

    const availablePercent = Math.round((available / total) * 100);
    const occupiedPercent = Math.round((occupied / total) * 100);

    if (this.dom.metricTotal) this.dom.metricTotal.textContent = total;
    if (this.dom.metricAvailable) this.dom.metricAvailable.textContent = available;
    if (this.dom.metricOccupied) this.dom.metricOccupied.textContent = occupied;

    if (this.dom.metricAvailablePercent) {
      this.dom.metricAvailablePercent.textContent = `${availablePercent}% Open Capacity`;
    }
    if (this.dom.metricOccupiedPercent) {
      this.dom.metricOccupiedPercent.textContent = `${occupiedPercent}% Occupancy Rate`;
    }

    if (this.dom.lotStatusPill) {
      if (available === 0) {
        this.dom.lotStatusPill.textContent = 'LOT FULL';
        this.dom.lotStatusPill.className = 'lot-status-pill full';
      } else {
        this.dom.lotStatusPill.textContent = `${available} SPACES OPEN`;
        this.dom.lotStatusPill.className = 'lot-status-pill';
      }
    }
  }

  renderVisualMap() {
    this.slots.forEach(slot => {
      const bay = document.getElementById(`bay-${slot.id}`);
      const tag = document.getElementById(`bayTag-${slot.id}`);
      const visualLabel = document.getElementById(`bayVisualLabel-${slot.id}`);
      if (!bay || !tag) return;

      if (slot.occupied) {
        bay.classList.remove('available');
        bay.classList.add('occupied');
        tag.textContent = 'OCCUPIED';
        if (visualLabel) visualLabel.textContent = 'OCCUPIED';
      } else {
        bay.classList.remove('occupied');
        bay.classList.add('available');
        tag.textContent = 'AVAILABLE';
        if (visualLabel) visualLabel.textContent = 'VACANT';
      }
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

  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem('slotix_theme', this.theme);
    } catch (e) {}
    this.applyTheme(this.theme);
  }

  applyTheme(theme) {
    if (theme === 'light') {
      document.body.classList.add('light-mode');
      if (this.dom.themeIconSun) this.dom.themeIconSun.classList.add('hidden');
      if (this.dom.themeIconMoon) this.dom.themeIconMoon.classList.remove('hidden');
      if (this.dom.themeToggleBtn) this.dom.themeToggleBtn.title = 'Switch to Dark Mode';
    } else {
      document.body.classList.remove('light-mode');
      if (this.dom.themeIconSun) this.dom.themeIconSun.classList.remove('hidden');
      if (this.dom.themeIconMoon) this.dom.themeIconMoon.classList.add('hidden');
      if (this.dom.themeToggleBtn) this.dom.themeToggleBtn.title = 'Switch to Light Mode';
    }
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    if (this.soundEnabled) {
      if (this.dom.soundIconOn) this.dom.soundIconOn.classList.remove('hidden');
      if (this.dom.soundIconOff) this.dom.soundIconOff.classList.add('hidden');
      this.playStatusSound(false);
    } else {
      if (this.dom.soundIconOn) this.dom.soundIconOn.classList.add('hidden');
      if (this.dom.soundIconOff) this.dom.soundIconOff.classList.remove('hidden');
    }
  }

  updateOnlineStatus(isOnline) {
    if (!this.dom.systemStatusLabel) return;
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
    if (this.dom.cfgDatabaseUrl) this.dom.cfgDatabaseUrl.value = this.config.databaseURL || '';
    if (this.dom.cfgApiKey) this.dom.cfgApiKey.value = this.config.apiKey || '';
    if (this.dom.cfgProjectId) this.dom.cfgProjectId.value = this.config.projectId || '';
    if (this.dom.settingsModal) this.dom.settingsModal.classList.remove('hidden');
  }

  closeSettings() {
    if (this.dom.settingsModal) this.dom.settingsModal.classList.add('hidden');
  }

  handleSaveFirebaseConfig() {
    const dbUrl = this.dom.cfgDatabaseUrl ? this.dom.cfgDatabaseUrl.value.trim() : '';
    const apiKey = this.dom.cfgApiKey ? this.dom.cfgApiKey.value.trim() : '';
    const projId = this.dom.cfgProjectId ? this.dom.cfgProjectId.value.trim() : '';

    if (!dbUrl) {
      alert('Please enter your Firebase Realtime Database URL');
      return;
    }

    const updatedConfig = {
      ...this.config,
      databaseURL: dbUrl.replace(/\/+$/, ''),
      apiKey: apiKey || this.config.apiKey,
      projectId: projId || this.config.projectId,
      authDomain: projId ? `${projId}.firebaseapp.com` : this.config.authDomain
    };

    saveFirebaseConfig(updatedConfig);
    this.config = updatedConfig;
    this.closeSettings();
    window.location.reload();
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.SlotixApp = new SlotixFirebaseApp();
});
