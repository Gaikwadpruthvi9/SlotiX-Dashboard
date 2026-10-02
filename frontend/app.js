/**
 * SLOTIX – Smart Parking System
 * Firebase Realtime Database Dashboard Controller
 * Architecture: IR Sensors → ESP8266 → Wi-Fi → Firebase Realtime Database → Slotix Dashboard
 */

class SlotixFirebaseApp {
  constructor() {
    // S01-S04 Parking Slot Mappings
    this.slots = [
      { id: "S01", name: "Parking Slot 1", occupied: false, status: "available", sensor: "IR1", sensorStatus: "normal", lastUpdated: null },
      { id: "S02", name: "Parking Slot 2", occupied: false, status: "available", sensor: "IR2", sensorStatus: "normal", lastUpdated: null },
      { id: "S03", name: "Parking Slot 3", occupied: false, status: "available", sensor: "IR3", sensorStatus: "normal", lastUpdated: null },
      { id: "S04", name: "Parking Slot 4", occupied: false, status: "available", sensor: "IR4", sensorStatus: "normal", lastUpdated: null }
    ];

    this.availableCount = null;
    this.occupiedCount = null;
    this.totalSlots = 4;
    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';

    this.firebaseApp = null;
    this.db = null;
    this.parkingRef = null;
    this.firebaseConnected = false;
    this.espOnline = false;
    this.lastPacketTime = null;
    this.soundEnabled = true;
    this.audioCtx = null;
    this.config = getFirebaseConfig();
    this.theme = localStorage.getItem('slotix_theme') || 'dark';

    this.init();
  }

  init() {
    this.ADMIN_EMAIL = 'gaikwadpruthvi200@gmail.com';

    // Verify authentication
    const isLoggedIn = localStorage.getItem('slotix_logged_in') === 'true';
    if (!isLoggedIn) {
      window.location.replace('login.html');
      return;
    }

    // Verify organisation selection
    const savedOrgStr = localStorage.getItem('slotix_selected_organisation');
    if (!savedOrgStr) {
      window.location.replace('select.html');
      return;
    }

    this.cacheDom();
    this.applyTheme(this.theme);
    this.setupAdminView();
    this.displaySelectedOrgInfo();
    this.bindEvents();
    this.registerPWA();
    this.renderAll();
    this.initFirebase();
    this.startClockTicker();
  }

  displaySelectedOrgInfo() {
    try {
      const orgStr = localStorage.getItem('slotix_selected_organisation');
      const locStr = localStorage.getItem('slotix_selected_location');
      const sub = document.getElementById('dashboardLocationSub');
      if (orgStr && sub) {
        const org = JSON.parse(orgStr);
        const loc = locStr ? JSON.parse(locStr) : null;
        if (loc && loc.name) {
          sub.textContent = `${loc.name} • ${org.name}`;
          sub.title = `${loc.name} • ${org.name}`;
        } else {
          sub.textContent = `${org.name}`;
        }
      }
    } catch (_) {}
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
      manualRefreshBtn: document.getElementById('manualRefreshBtn'),
      headerAdminBadge: document.getElementById('headerAdminBadge'),
      userRoleBadge: document.getElementById('userRoleBadge'),
      currentAccountEmail: document.getElementById('currentAccountEmail'),
      currentAccountRole: document.getElementById('currentAccountRole'),
      adminSettingsSection: document.getElementById('adminSettingsSection'),
      userRestrictedNotice: document.getElementById('userRestrictedNotice'),
      modalTitle: document.getElementById('modalTitle')
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
          localStorage.removeItem('slotix_selected_location');
          localStorage.removeItem('slotix_selected_organisation');
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
        this.handleFirebaseError(new Error('Firebase SDK offline or failed to load.'));
        return;
      }

      // Initialize App (prevent duplicate initialization)
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
        this.updateConnectionState(isConnected);
      });

      // 2. Real-Time Telemetry Listener (/parking)
      // NodeMCU ESP8266 writes live slot data to /parking every ~1s
      this.parkingRef = this.db.ref('/parking');
      this.parkingRef.on('value', (snapshot) => {
        const data = snapshot.val();
        this.isLoading = false;
        this.hasError = false;
        if (data) {
          this.lastPacketTime = Date.now();
          this.handleParkingUpdate(data);
        }
      }, (error) => {
        this.handleFirebaseError(error);
      });

      // Fallback listener for legacy /slots path if needed
      this.db.ref('/slots').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data && this.isLoading) {
          this.isLoading = false;
          this.hasError = false;
          this.lastPacketTime = Date.now();
          this.handleParkingUpdate(data);
        }
      });

    } catch (err) {
      this.handleFirebaseError(err);
    }
  }

  // Handle incoming live data from /parking
  handleParkingUpdate(data) {
    if (!data || typeof data !== 'object') return;

    // 1. Available & Occupied counts from /parking/available and /parking/occupied
    if (typeof data.available === 'number') {
      this.availableCount = data.available;
    } else if (data.available !== undefined && !isNaN(Number(data.available))) {
      this.availableCount = Number(data.available);
    }

    if (typeof data.occupied === 'number') {
      this.occupiedCount = data.occupied;
    } else if (data.occupied !== undefined && !isNaN(Number(data.occupied))) {
      this.occupiedCount = Number(data.occupied);
    }

    // 2. Map Firebase data to individual parking slots S01 - S04
    this.slots.forEach(slot => {
      const slotData = data[slot.id];
      if (slotData !== undefined && slotData !== null) {
        let isOccupied = false;
        let sensorId = slot.sensor;
        let sensorStat = slot.sensorStatus;

        if (typeof slotData === 'object') {
          // Schema: { status: "available" | "occupied", sensor: "IR1", sensorStatus: "normal" }
          if (slotData.status) {
            const normalized = String(slotData.status).toLowerCase().trim();
            isOccupied = (normalized === 'occupied');
          } else if (slotData.occupied !== undefined) {
            isOccupied = Boolean(slotData.occupied);
          }

          if (slotData.sensor) {
            sensorId = String(slotData.sensor);
          }
          if (slotData.sensorStatus) {
            sensorStat = String(slotData.sensorStatus);
          }
        } else if (typeof slotData === 'string') {
          isOccupied = (slotData.toLowerCase().trim() === 'occupied' || slotData === '1');
        } else if (typeof slotData === 'number') {
          isOccupied = (slotData === 1);
        } else if (typeof slotData === 'boolean') {
          isOccupied = slotData;
        }

        // Detect state change to play acoustic chime
        if (slot.occupied !== isOccupied) {
          slot.occupied = isOccupied;
          slot.status = isOccupied ? 'occupied' : 'available';
          slot.lastUpdated = Date.now();
          this.playStatusSound(slot.occupied);
        }

        slot.status = isOccupied ? 'occupied' : 'available';
        slot.sensor = sensorId;
        slot.sensorStatus = sensorStat;
      }
    });

    this.renderAll();
  }

  updateConnectionState(isConnected) {
    if (isConnected) {
      if (this.dom.systemPulse) this.dom.systemPulse.classList.remove('offline');
      if (this.dom.systemStatusLabel) {
        this.dom.systemStatusLabel.classList.remove('offline');
        this.dom.systemStatusLabel.textContent = this.isLoading 
          ? 'SYNCING LIVE DATA...' 
          : 'FIREBASE CONNECTED • LIVE';
      }
      if (this.dom.latencyTag) {
        this.dom.latencyTag.textContent = 'Firebase: Live Synchronized';
      }
    } else {
      if (this.dom.systemPulse) this.dom.systemPulse.classList.add('offline');
      if (this.dom.systemStatusLabel) {
        this.dom.systemStatusLabel.classList.add('offline');
        this.dom.systemStatusLabel.textContent = 'CONNECTING TO FIREBASE...';
      }
      if (this.dom.latencyTag) {
        this.dom.latencyTag.textContent = 'Connecting to Cloud...';
      }
    }
  }

  handleFirebaseError(error) {
    console.warn('Firebase connection notice:', error);
    this.hasError = true;
    this.isLoading = false;

    if (this.dom.systemPulse) {
      this.dom.systemPulse.classList.add('offline');
    }
    if (this.dom.systemStatusLabel) {
      this.dom.systemStatusLabel.classList.add('offline');
      this.dom.systemStatusLabel.textContent = 'FIREBASE OFFLINE';
    }
    if (this.dom.latencyTag) {
      this.dom.latencyTag.textContent = 'Connection notice - Retrying';
    }
    if (this.dom.heartbeatBadge) {
      this.dom.heartbeatBadge.textContent = 'ESP8266: Standby';
      this.dom.heartbeatBadge.className = 'heartbeat-badge';
    }

    this.renderAll();
  }

  forceSync() {
    if (this.dom.manualRefreshBtn) {
      const btn = this.dom.manualRefreshBtn;
      btn.style.opacity = '0.6';
      setTimeout(() => { if (btn) btn.style.opacity = '1'; }, 600);
    }

    if (this.db) {
      this.db.ref('/parking').once('value').then(snap => {
        const val = snap.val();
        if (val) {
          this.isLoading = false;
          this.hasError = false;
          this.lastPacketTime = Date.now();
          this.handleParkingUpdate(val);
        }
      }).catch(err => {
        this.handleFirebaseError(err);
      });
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

    if (this.isLoading && !this.lastPacketTime) {
      this.dom.lastUpdatedLabel.textContent = 'Sync: Connecting...';
      if (this.dom.heartbeatBadge) {
        this.dom.heartbeatBadge.textContent = 'ESP8266: Connecting';
        this.dom.heartbeatBadge.className = 'heartbeat-badge';
      }
      return;
    }

    if (!this.lastPacketTime) {
      this.dom.lastUpdatedLabel.textContent = 'Sync: Awaiting data';
      if (this.dom.heartbeatBadge) {
        this.dom.heartbeatBadge.textContent = 'ESP8266: Standby';
        this.dom.heartbeatBadge.className = 'heartbeat-badge';
      }
      return;
    }

    const elapsedSec = Math.floor((Date.now() - this.lastPacketTime) / 1000);
    this.dom.lastUpdatedLabel.textContent = `Sync: ${elapsedSec}s ago`;

    // ESP8266 updates approximately every 1 second:
    // When live updates are arriving:
    const isLive = elapsedSec <= 10;
    this.espOnline = isLive;

    if (this.dom.heartbeatBadge) {
      if (isLive) {
        this.dom.heartbeatBadge.textContent = 'ESP8266: Online';
        this.dom.heartbeatBadge.className = 'heartbeat-badge online';
      } else if (elapsedSec <= 30) {
        this.dom.heartbeatBadge.textContent = 'ESP8266: Idle';
        this.dom.heartbeatBadge.className = 'heartbeat-badge';
      } else {
        this.dom.heartbeatBadge.textContent = 'ESP8266: Standby';
        this.dom.heartbeatBadge.className = 'heartbeat-badge';
      }
    }
  }

  renderAll() {
    this.renderMetrics();
    this.renderVisualMap();
  }

  renderMetrics() {
    const total = this.totalSlots;
    const computedOccupied = this.slots.filter(s => s.occupied).length;
    const computedAvailable = total - computedOccupied;

    const available = (typeof this.availableCount === 'number') 
      ? this.availableCount 
      : computedAvailable;

    const occupied = (typeof this.occupiedCount === 'number') 
      ? this.occupiedCount 
      : computedOccupied;

    if (this.isLoading) {
      if (this.dom.metricTotal) this.dom.metricTotal.textContent = total;
      if (this.dom.metricAvailable) this.dom.metricAvailable.textContent = '...';
      if (this.dom.metricOccupied) this.dom.metricOccupied.textContent = '...';
      if (this.dom.metricAvailablePercent) {
        this.dom.metricAvailablePercent.textContent = 'Syncing capacity...';
      }
      if (this.dom.metricOccupiedPercent) {
        this.dom.metricOccupiedPercent.textContent = 'Connecting to sensors...';
      }
      if (this.dom.lotStatusPill) {
        this.dom.lotStatusPill.textContent = 'SYNCING...';
        this.dom.lotStatusPill.className = 'lot-status-pill';
      }
      return;
    }

    const availablePercent = total > 0 ? Math.round((available / total) * 100) : 0;
    const occupiedPercent = total > 0 ? Math.round((occupied / total) * 100) : 0;

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
      const sensorBadge = document.getElementById(`baySensor-${slot.id}`);

      if (!bay || !tag) return;

      bay.setAttribute('title', `${slot.name} (${slot.id}): ${slot.status.toUpperCase()}`);

      if (this.isLoading) {
        if (visualLabel) visualLabel.textContent = 'SYNCING...';
        tag.textContent = 'CONNECTING';
        if (sensorBadge) sensorBadge.textContent = `${slot.sensor || 'IR'}: ...`;
        return;
      }

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

      // Update sensor status where the existing UI supports it
      if (sensorBadge) {
        const sensorText = slot.sensor ? `${slot.sensor} • ${(slot.sensorStatus || 'normal').toUpperCase()}` : `IR • ${(slot.sensorStatus || 'normal').toUpperCase()}`;
        sensorBadge.textContent = sensorText;
        sensorBadge.title = `Sensor: ${slot.sensor || 'IR'} | Status: ${slot.sensorStatus || 'normal'} | ${slot.name}`;
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

  isAdmin() {
    const currentUser = (localStorage.getItem('slotix_current_user') || '').toLowerCase().trim();
    const isAdminFlag = localStorage.getItem('slotix_is_admin') === 'true';
    return currentUser === 'gaikwadpruthvi200@gmail.com' || isAdminFlag;
  }

  setupAdminView() {
    const isAdmin = this.isAdmin();
    const currentUser = localStorage.getItem('slotix_current_user') || (isAdmin ? 'gaikwadpruthvi200@gmail.com' : 'Guest User');

    // Header badge
    if (this.dom.headerAdminBadge) {
      if (isAdmin) {
        this.dom.headerAdminBadge.classList.remove('hidden');
      } else {
        this.dom.headerAdminBadge.classList.add('hidden');
      }
    }

    // Modal account details
    if (this.dom.currentAccountEmail) {
      this.dom.currentAccountEmail.textContent = currentUser;
    }

    if (this.dom.currentAccountRole) {
      this.dom.currentAccountRole.textContent = isAdmin 
        ? 'Administrator (Full Hardware & Cloud Access)' 
        : 'Standard User (Monitoring Access)';
    }

    if (this.dom.userRoleBadge) {
      this.dom.userRoleBadge.textContent = isAdmin ? 'ADMIN' : 'USER';
      this.dom.userRoleBadge.className = isAdmin ? 'user-role-badge admin' : 'user-role-badge user';
    }

    if (this.dom.modalTitle) {
      this.dom.modalTitle.textContent = isAdmin ? 'Firebase & Hardware Setup' : 'Account & System Info';
    }

    // Admin vs restricted sections
    if (this.dom.adminSettingsSection) {
      if (isAdmin) {
        this.dom.adminSettingsSection.classList.remove('hidden');
      } else {
        this.dom.adminSettingsSection.classList.add('hidden');
      }
    }

    if (this.dom.userRestrictedNotice) {
      if (isAdmin) {
        this.dom.userRestrictedNotice.classList.add('hidden');
      } else {
        this.dom.userRestrictedNotice.classList.remove('hidden');
      }
    }
  }

  openSettings() {
    this.setupAdminView();
    if (this.isAdmin()) {
      if (this.dom.cfgDatabaseUrl) this.dom.cfgDatabaseUrl.value = this.config.databaseURL || '';
      if (this.dom.cfgApiKey) this.dom.cfgApiKey.value = this.config.apiKey || '';
      if (this.dom.cfgProjectId) this.dom.cfgProjectId.value = this.config.projectId || '';
    }
    if (this.dom.settingsModal) this.dom.settingsModal.classList.remove('hidden');
  }

  closeSettings() {
    if (this.dom.settingsModal) this.dom.settingsModal.classList.add('hidden');
  }

  handleSaveFirebaseConfig() {
    if (!this.isAdmin()) {
      alert('Access Denied: Only administrator (gaikwadpruthvi200@gmail.com) can modify Firebase configuration.');
      return;
    }

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
