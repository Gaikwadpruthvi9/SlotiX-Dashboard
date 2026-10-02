/**
 * SLOTIX – Smart Parking System
 * Portal Controller: Location & Organisation Selection Flow
 * Flow: SIGN IN → SELECT LOCATION → SELECT ORGANISATION → DASHBOARD
 * Features: Admin CRUD controls, Non-Admin restricted access,
 * Real-time Firebase sync, Live search, "Not Integrated" workflow handling.
 */

document.addEventListener('DOMContentLoaded', () => {
  // ==========================================
  // 1. Authentication & Role Verification
  // ==========================================
  const ADMIN_EMAIL = 'gaikwadpruthvi200@gmail.com';
  const isLoggedIn = localStorage.getItem('slotix_logged_in') === 'true';

  if (!isLoggedIn) {
    window.location.replace('login.html');
    return;
  }

  const currentUser = localStorage.getItem('slotix_current_user') || 'User';
  const isAdmin = currentUser.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase() ||
                  localStorage.getItem('slotix_is_admin') === 'true';

  // ==========================================
  // 2. DOM Elements Cache
  // ==========================================
  const dom = {
    // Header & Theme
    userEmailDisplay: document.getElementById('userEmailDisplay'),
    roleBadge: document.getElementById('roleBadge'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    themeIconSun: document.getElementById('themeIconSun'),
    themeIconMoon: document.getElementById('themeIconMoon'),
    signOutBtn: document.getElementById('signOutBtn'),

    // Flow Stepper
    stepIndicatorLocation: document.getElementById('stepIndicatorLocation'),
    stepIndicatorOrg: document.getElementById('stepIndicatorOrg'),
    stepIndicatorDash: document.getElementById('stepIndicatorDash'),
    stepDivider1: document.getElementById('stepDivider1'),
    stepDivider2: document.getElementById('stepDivider2'),

    // Cloud Status
    firebasePulseDot: document.getElementById('firebasePulseDot'),
    firebaseStatusText: document.getElementById('firebaseStatusText'),
    realtimeCounter: document.getElementById('realtimeCounter'),

    // Views
    locationView: document.getElementById('locationView'),
    organisationView: document.getElementById('organisationView'),

    // View 1: Location
    adminLocationActions: document.getElementById('adminLocationActions'),
    openAddLocationModalBtn: document.getElementById('openAddLocationModalBtn'),
    locationSearchInput: document.getElementById('locationSearchInput'),
    clearLocationSearchBtn: document.getElementById('clearLocationSearchBtn'),
    locationsList: document.getElementById('locationsList'),
    locationsEmptyState: document.getElementById('locationsEmptyState'),
    locationEmptyTitle: document.getElementById('locationEmptyTitle'),
    locationEmptyDesc: document.getElementById('locationEmptyDesc'),
    adminEmptyLocationAction: document.getElementById('adminEmptyLocationAction'),
    emptyAddLocationBtn: document.getElementById('emptyAddLocationBtn'),

    // View 2: Organisation
    backToLocationsBtn: document.getElementById('backToLocationsBtn'),
    activeLocationBadge: document.getElementById('activeLocationBadge'),
    orgViewSubtitle: document.getElementById('orgViewSubtitle'),
    adminOrgActions: document.getElementById('adminOrgActions'),
    openAddOrgModalBtn: document.getElementById('openAddOrgModalBtn'),
    orgSearchInput: document.getElementById('orgSearchInput'),
    clearOrgSearchBtn: document.getElementById('clearOrgSearchBtn'),
    organisationsList: document.getElementById('organisationsList'),
    orgsEmptyState: document.getElementById('orgsEmptyState'),
    orgEmptyTitle: document.getElementById('orgEmptyTitle'),
    orgEmptyDesc: document.getElementById('orgEmptyDesc'),
    adminEmptyOrgAction: document.getElementById('adminEmptyOrgAction'),
    emptyAddOrgBtn: document.getElementById('emptyAddOrgBtn'),

    // Not Integrated Modal
    notIntegratedModal: document.getElementById('notIntegratedModal'),
    noticeOrgName: document.getElementById('noticeOrgName'),
    noticeLocName: document.getElementById('noticeLocName'),
    adminEnableNoticeBox: document.getElementById('adminEnableNoticeBox'),
    adminQuickIntegrateBtn: document.getElementById('adminQuickIntegrateBtn'),
    closeNotIntegratedBtn: document.getElementById('closeNotIntegratedBtn'),
    noticeBackToLocationsBtn: document.getElementById('noticeBackToLocationsBtn'),

    // Location Modal
    locationModal: document.getElementById('locationModal'),
    locationModalTitle: document.getElementById('locationModalTitle'),
    locationForm: document.getElementById('locationForm'),
    locFormMode: document.getElementById('locFormMode'),
    locFormId: document.getElementById('locFormId'),
    locNameInput: document.getElementById('locNameInput'),
    locCityInput: document.getElementById('locCityInput'),
    locCodeInput: document.getElementById('locCodeInput'),
    locNameError: document.getElementById('locNameError'),
    closeLocationModalBtn: document.getElementById('closeLocationModalBtn'),
    cancelLocationBtn: document.getElementById('cancelLocationBtn'),

    // Organisation Modal
    orgModal: document.getElementById('orgModal'),
    orgModalTitle: document.getElementById('orgModalTitle'),
    orgModalSubtitle: document.getElementById('orgModalSubtitle'),
    orgForm: document.getElementById('orgForm'),
    orgFormMode: document.getElementById('orgFormMode'),
    orgFormId: document.getElementById('orgFormId'),
    orgNameInput: document.getElementById('orgNameInput'),
    orgCodeInput: document.getElementById('orgCodeInput'),
    radioIntegrated: document.getElementById('radioIntegrated'),
    radioNotIntegrated: document.getElementById('radioNotIntegrated'),
    orgNameError: document.getElementById('orgNameError'),
    closeOrgModalBtn: document.getElementById('closeOrgModalBtn'),
    cancelOrgBtn: document.getElementById('cancelOrgBtn'),

    // Delete Modal
    deleteModal: document.getElementById('deleteModal'),
    deleteModalTitle: document.getElementById('deleteModalTitle'),
    deleteConfirmText: document.getElementById('deleteConfirmText'),
    closeDeleteModalBtn: document.getElementById('closeDeleteModalBtn'),
    cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn')
  };

  // ==========================================
  // 3. State Management
  // ==========================================
  let locationsData = {}; // Root object from Firebase /locations: { [locId]: { id, name, city, code, organisations: { ... } } }
  let currentStep = 'location'; // 'location' | 'organisation'
  let activeLocationId = null;
  let clickedNotIntegratedOrg = null; // For admin quick-enable
  let pendingDeleteAction = null; // Callback for delete confirmation

  // Initialize UI Header info
  if (dom.userEmailDisplay) dom.userEmailDisplay.textContent = currentUser;
  if (dom.roleBadge) {
    if (isAdmin) {
      dom.roleBadge.textContent = 'ADMIN';
      dom.roleBadge.className = 'user-role-tag admin';
      if (dom.adminLocationActions) dom.adminLocationActions.classList.remove('hidden');
      if (dom.adminOrgActions) dom.adminOrgActions.classList.remove('hidden');
      if (dom.adminEnableNoticeBox) dom.adminEnableNoticeBox.classList.remove('hidden');
    } else {
      dom.roleBadge.textContent = 'USER';
      dom.roleBadge.className = 'user-role-tag user';
      if (dom.adminLocationActions) dom.adminLocationActions.classList.add('hidden');
      if (dom.adminOrgActions) dom.adminOrgActions.classList.add('hidden');
      if (dom.adminEnableNoticeBox) dom.adminEnableNoticeBox.classList.add('hidden');
    }
  }

  // ==========================================
  // 4. Theme System
  // ==========================================
  let currentTheme = localStorage.getItem('slotix_theme') || 'dark';

  function applyTheme(theme) {
    currentTheme = theme;
    if (theme === 'light') {
      document.body.classList.add('light-mode');
      if (dom.themeIconSun) dom.themeIconSun.classList.add('hidden');
      if (dom.themeIconMoon) dom.themeIconMoon.classList.remove('hidden');
      if (dom.themeToggleBtn) dom.themeToggleBtn.title = 'Switch to Dark Mode';
    } else {
      document.body.classList.remove('light-mode');
      if (dom.themeIconSun) dom.themeIconSun.classList.remove('hidden');
      if (dom.themeIconMoon) dom.themeIconMoon.classList.add('hidden');
      if (dom.themeToggleBtn) dom.themeToggleBtn.title = 'Switch to Light Mode';
    }
  }

  applyTheme(currentTheme);

  if (dom.themeToggleBtn) {
    dom.themeToggleBtn.addEventListener('click', () => {
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('slotix_theme', nextTheme);
      applyTheme(nextTheme);
    });
  }

  // ==========================================
  // 5. Toast System
  // ==========================================
  function showToast(message, type = 'info') {
    let toast = document.getElementById('portalToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'portalToast';
      toast.className = 'portal-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = `portal-toast show ${type}`;
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.className = 'portal-toast';
    }, 3200);
  }

  // ==========================================
  // 6. Sign Out Handler
  // ==========================================
  if (dom.signOutBtn) {
    dom.signOutBtn.addEventListener('click', () => {
      localStorage.removeItem('slotix_logged_in');
      localStorage.removeItem('slotix_current_user');
      localStorage.removeItem('slotix_selected_location');
      localStorage.removeItem('slotix_selected_organisation');
      window.location.replace('login.html');
    });
  }

  // ==========================================
  // 7. Firebase Realtime Database Connection
  // ==========================================
  let firebaseApp = null;
  let db = null;

  function initFirebase() {
    try {
      const config = typeof getFirebaseConfig === 'function' ? getFirebaseConfig() : null;
      if (!config) {
        setCloudStatus(false, 'Firebase Config Missing');
        return;
      }

      if (typeof firebase === 'undefined') {
        setCloudStatus(false, 'Firebase SDK Offline');
        return;
      }

      if (!firebase.apps.length) {
        firebaseApp = firebase.initializeApp(config);
      } else {
        firebaseApp = firebase.app();
      }

      db = firebase.database();

      // Monitor network connectivity
      db.ref('.info/connected').on('value', (snap) => {
        const isConnected = Boolean(snap.val());
        if (isConnected) {
          setCloudStatus(true, 'Firebase Live Cloud');
        } else {
          setCloudStatus(false, 'Connecting to Cloud...');
        }
      });

      // Realtime listener for /locations
      // NO sample data! We read exact data from Firebase
      db.ref('/locations').on('value', (snapshot) => {
        const val = snapshot.val();
        locationsData = val && typeof val === 'object' ? val : {};
        // Cache in local storage for offline resilience
        try {
          localStorage.setItem('slotix_locations_cache', JSON.stringify(locationsData));
        } catch (_) {}

        updateCounterDisplay();
        renderCurrentView();
      }, (error) => {
        console.warn('Firebase /locations listener notice:', error);
        // Fallback to cache if available
        loadCachedData();
        renderCurrentView();
      });

    } catch (err) {
      console.error('Firebase init error:', err);
      setCloudStatus(false, 'Offline Mode');
      loadCachedData();
      renderCurrentView();
    }
  }

  function loadCachedData() {
    try {
      const cached = localStorage.getItem('slotix_locations_cache');
      if (cached) {
        locationsData = JSON.parse(cached);
      }
    } catch (_) {}
  }

  function setCloudStatus(isLive, label) {
    if (dom.firebasePulseDot) {
      if (isLive) {
        dom.firebasePulseDot.classList.remove('offline');
      } else {
        dom.firebasePulseDot.classList.add('offline');
      }
    }
    if (dom.firebaseStatusText) {
      dom.firebaseStatusText.textContent = label;
    }
  }

  function updateCounterDisplay() {
    if (!dom.realtimeCounter) return;
    const count = Object.keys(locationsData).length;
    dom.realtimeCounter.textContent = `${count} Location${count === 1 ? '' : 's'}`;
  }

  // ==========================================
  // 8. Navigation & Stepper Controller
  // ==========================================
  function navigateTo(step, locationId = null) {
    currentStep = step;

    if (step === 'location') {
      activeLocationId = null;
      if (dom.locationView) dom.locationView.classList.remove('hidden');
      if (dom.organisationView) dom.organisationView.classList.add('hidden');

      if (dom.stepIndicatorLocation) dom.stepIndicatorLocation.className = 'flow-step active';
      if (dom.stepIndicatorOrg) dom.stepIndicatorOrg.className = 'flow-step';
      if (dom.stepIndicatorDash) dom.stepIndicatorDash.className = 'flow-step';

      renderLocations();
    } else if (step === 'organisation') {
      activeLocationId = locationId;
      if (dom.locationView) dom.locationView.classList.add('hidden');
      if (dom.organisationView) dom.organisationView.classList.remove('hidden');

      if (dom.stepIndicatorLocation) dom.stepIndicatorLocation.className = 'flow-step';
      if (dom.stepIndicatorOrg) dom.stepIndicatorOrg.className = 'flow-step active';
      if (dom.stepIndicatorDash) dom.stepIndicatorDash.className = 'flow-step';

      const loc = locationsData[locationId];
      if (dom.activeLocationBadge) {
        dom.activeLocationBadge.textContent = loc ? loc.name : 'Location';
      }
      if (dom.orgViewSubtitle) {
        dom.orgViewSubtitle.textContent = loc ? `Organisations at ${loc.name}${loc.city ? ` (${loc.city})` : ''}` : 'Organisations';
      }

      renderOrganisations();
    }
  }

  function renderCurrentView() {
    if (currentStep === 'location') {
      renderLocations();
    } else if (currentStep === 'organisation') {
      // If the currently viewed location was deleted by an admin, return to locations list
      if (!activeLocationId || !locationsData[activeLocationId]) {
        navigateTo('location');
        showToast('Selected location is no longer available', 'error');
      } else {
        renderOrganisations();
      }
    }
  }

  if (dom.backToLocationsBtn) {
    dom.backToLocationsBtn.addEventListener('click', () => navigateTo('location'));
  }

  // ==========================================
  // 9. View 1: Locations Rendering & Search
  // ==========================================
  function renderLocations() {
    if (!dom.locationsList) return;

    const searchTerm = dom.locationSearchInput ? dom.locationSearchInput.value.toLowerCase().trim() : '';
    const locKeys = Object.keys(locationsData);

    // Filter locations by search term
    const filteredKeys = locKeys.filter((key) => {
      const loc = locationsData[key];
      if (!loc) return false;
      const name = (loc.name || '').toLowerCase();
      const city = (loc.city || '').toLowerCase();
      const code = (loc.code || '').toLowerCase();
      return name.includes(searchTerm) || city.includes(searchTerm) || code.includes(searchTerm);
    });

    dom.locationsList.innerHTML = '';

    if (locKeys.length === 0) {
      // Empty database state
      if (dom.locationsEmptyState) dom.locationsEmptyState.classList.remove('hidden');
      if (dom.locationEmptyTitle) dom.locationEmptyTitle.textContent = 'No Locations Configured';
      if (dom.locationEmptyDesc) {
        dom.locationEmptyDesc.textContent = isAdmin
          ? 'No locations have been created yet. As an administrator, tap Add Location below to add one.'
          : 'No parking locations available yet. Locations configured by your administrator will appear here in real time.';
      }
      if (dom.adminEmptyLocationAction) {
        if (isAdmin) {
          dom.adminEmptyLocationAction.classList.remove('hidden');
        } else {
          dom.adminEmptyLocationAction.classList.add('hidden');
        }
      }
      return;
    }

    if (filteredKeys.length === 0) {
      // Search gave 0 matches
      if (dom.locationsEmptyState) dom.locationsEmptyState.classList.remove('hidden');
      if (dom.locationEmptyTitle) dom.locationEmptyTitle.textContent = 'No Matching Locations';
      if (dom.locationEmptyDesc) dom.locationEmptyDesc.textContent = `No locations matched "${searchTerm}". Try a different keyword.`;
      if (dom.adminEmptyLocationAction) dom.adminEmptyLocationAction.classList.add('hidden');
      return;
    }

    if (dom.locationsEmptyState) dom.locationsEmptyState.classList.add('hidden');

    // Sort locations alphabetically by name
    filteredKeys.sort((a, b) => {
      const nameA = (locationsData[a].name || '').toLowerCase();
      const nameB = (locationsData[b].name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

    filteredKeys.forEach((key) => {
      const loc = locationsData[key];
      const orgsObj = loc.organisations || {};
      const orgCount = Object.keys(orgsObj).length;

      const card = document.createElement('div');
      card.className = 'item-card';
      card.setAttribute('role', 'listitem');
      card.dataset.locationId = key;

      card.innerHTML = `
        <div class="item-content" data-action="select-location">
          <div class="item-icon-box">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
          <div class="item-details">
            <div class="item-title-row">
              <strong class="item-title">${escapeHtml(loc.name || 'Unnamed Location')}</strong>
              ${loc.code ? `<span class="item-sub-tag">${escapeHtml(loc.code)}</span>` : ''}
            </div>
            <p class="item-sub">
              ${escapeHtml(loc.city || 'Parking Facility')}
            </p>
          </div>
        </div>

        <div class="item-right-actions">
          <span class="item-meta-count">${orgCount} Org${orgCount === 1 ? '' : 's'}</span>

          ${isAdmin ? `
            <button type="button" class="action-btn-sm edit" data-action="edit-location" title="Edit location" aria-label="Edit location">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button type="button" class="action-btn-sm delete" data-action="delete-location" title="Delete location" aria-label="Delete location">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          ` : ''}

          <svg class="chevron-arrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>
      `;

      // Event Listeners on Card
      card.addEventListener('click', (e) => {
        const actionBtn = e.target.closest('[data-action]');
        const action = actionBtn ? actionBtn.dataset.action : 'select-location';

        if (action === 'edit-location') {
          e.stopPropagation();
          openEditLocationModal(key);
        } else if (action === 'delete-location') {
          e.stopPropagation();
          confirmDeleteLocation(key);
        } else {
          // Select location -> Navigate to Organisation selection
          navigateTo('organisation', key);
        }
      });

      dom.locationsList.appendChild(card);
    });
  }

  // Location Search Listeners
  if (dom.locationSearchInput) {
    dom.locationSearchInput.addEventListener('input', () => {
      const val = dom.locationSearchInput.value;
      if (dom.clearLocationSearchBtn) {
        if (val) {
          dom.clearLocationSearchBtn.classList.remove('hidden');
        } else {
          dom.clearLocationSearchBtn.classList.add('hidden');
        }
      }
      renderLocations();
    });
  }

  if (dom.clearLocationSearchBtn) {
    dom.clearLocationSearchBtn.addEventListener('click', () => {
      if (dom.locationSearchInput) {
        dom.locationSearchInput.value = '';
        dom.locationSearchInput.focus();
      }
      dom.clearLocationSearchBtn.classList.add('hidden');
      renderLocations();
    });
  }

  // ==========================================
  // 10. View 2: Organisations Rendering & Search
  // ==========================================
  function renderOrganisations() {
    if (!dom.organisationsList) return;

    const loc = locationsData[activeLocationId];
    if (!loc) {
      navigateTo('location');
      return;
    }

    const orgsObj = loc.organisations || {};
    const orgKeys = Object.keys(orgsObj);
    const searchTerm = dom.orgSearchInput ? dom.orgSearchInput.value.toLowerCase().trim() : '';

    const filteredKeys = orgKeys.filter((key) => {
      const org = orgsObj[key];
      if (!org) return false;
      const name = (org.name || '').toLowerCase();
      const code = (org.code || '').toLowerCase();
      return name.includes(searchTerm) || code.includes(searchTerm);
    });

    dom.organisationsList.innerHTML = '';

    if (orgKeys.length === 0) {
      if (dom.orgsEmptyState) dom.orgsEmptyState.classList.remove('hidden');
      if (dom.orgEmptyTitle) dom.orgEmptyTitle.textContent = 'No Organisations Configured';
      if (dom.orgEmptyDesc) {
        dom.orgEmptyDesc.textContent = isAdmin
          ? `No organisations registered under ${loc.name} yet. Tap Add Organisation below to create one.`
          : `No organisations found under ${loc.name}. Contact your administrator.`;
      }
      if (dom.adminEmptyOrgAction) {
        if (isAdmin) {
          dom.adminEmptyOrgAction.classList.remove('hidden');
        } else {
          dom.adminEmptyOrgAction.classList.add('hidden');
        }
      }
      return;
    }

    if (filteredKeys.length === 0) {
      if (dom.orgsEmptyState) dom.orgsEmptyState.classList.remove('hidden');
      if (dom.orgEmptyTitle) dom.orgEmptyTitle.textContent = 'No Matching Organisations';
      if (dom.orgEmptyDesc) dom.orgEmptyDesc.textContent = `No organisations under ${loc.name} match "${searchTerm}".`;
      if (dom.adminEmptyOrgAction) dom.adminEmptyOrgAction.classList.add('hidden');
      return;
    }

    if (dom.orgsEmptyState) dom.orgsEmptyState.classList.add('hidden');

    // Sort: Integrated first, then alphabetically by name
    filteredKeys.sort((a, b) => {
      const orgA = orgsObj[a];
      const orgB = orgsObj[b];
      if (Boolean(orgA.isIntegrated) !== Boolean(orgB.isIntegrated)) {
        return orgA.isIntegrated ? -1 : 1;
      }
      return (orgA.name || '').localeCompare(orgB.name || '');
    });

    filteredKeys.forEach((orgKey) => {
      const org = orgsObj[orgKey];
      const isIntegrated = Boolean(org.isIntegrated);

      const card = document.createElement('div');
      card.className = 'item-card';
      card.setAttribute('role', 'listitem');
      card.dataset.orgId = orgKey;

      card.innerHTML = `
        <div class="item-content" data-action="select-org">
          <div class="item-icon-box org-icon">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 21h18"></path>
              <path d="M5 21V7l8-4v18"></path>
              <path d="M19 21V11l-6-4"></path>
              <line x1="9" y1="9" x2="9" y2="9.01"></line>
              <line x1="9" y1="13" x2="9" y2="13.01"></line>
              <line x1="9" y1="17" x2="9" y2="17.01"></line>
            </svg>
          </div>
          <div class="item-details">
            <div class="item-title-row">
              <strong class="item-title">${escapeHtml(org.name || 'Unnamed Org')}</strong>
              ${isIntegrated 
                ? `<span class="status-pill-online"><span class="badge-dot"></span> Integrated</span>` 
                : `<span class="status-pill-offline"><span class="badge-dot"></span> Not Integrated</span>`}
            </div>
            <p class="item-sub">
              ${org.code ? `<span class="item-sub-tag">${escapeHtml(org.code)}</span> • ` : ''}
              ${escapeHtml(loc.name)}
            </p>
          </div>
        </div>

        <div class="item-right-actions">
          ${isAdmin ? `
            <button 
              type="button" 
              class="action-btn-sm toggle-status" 
              data-action="toggle-status" 
              title="${isIntegrated ? 'Mark as Not Integrated' : 'Mark as Integrated'}" 
              aria-label="Toggle integration status"
            >
              ${isIntegrated ? 'Mark Offline' : 'Mark Live'}
            </button>
            <button type="button" class="action-btn-sm edit" data-action="edit-org" title="Edit organisation" aria-label="Edit organisation">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button type="button" class="action-btn-sm delete" data-action="delete-org" title="Delete organisation" aria-label="Delete organisation">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          ` : ''}

          <svg class="chevron-arrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>
      `;

      // Event listener on Card
      card.addEventListener('click', (e) => {
        const actionBtn = e.target.closest('[data-action]');
        const action = actionBtn ? actionBtn.dataset.action : 'select-org';

        if (action === 'toggle-status') {
          e.stopPropagation();
          handleToggleOrgStatus(activeLocationId, orgKey, !isIntegrated);
        } else if (action === 'edit-org') {
          e.stopPropagation();
          openEditOrgModal(activeLocationId, orgKey);
        } else if (action === 'delete-org') {
          e.stopPropagation();
          confirmDeleteOrg(activeLocationId, orgKey);
        } else {
          // Select Organisation
          handleOrgSelection(loc, org, orgKey);
        }
      });

      dom.organisationsList.appendChild(card);
    });
  }

  // Organisation Search Listeners
  if (dom.orgSearchInput) {
    dom.orgSearchInput.addEventListener('input', () => {
      const val = dom.orgSearchInput.value;
      if (dom.clearOrgSearchBtn) {
        if (val) {
          dom.clearOrgSearchBtn.classList.remove('hidden');
        } else {
          dom.clearOrgSearchBtn.classList.add('hidden');
        }
      }
      renderOrganisations();
    });
  }

  if (dom.clearOrgSearchBtn) {
    dom.clearOrgSearchBtn.addEventListener('click', () => {
      if (dom.orgSearchInput) {
        dom.orgSearchInput.value = '';
        dom.orgSearchInput.focus();
      }
      dom.clearOrgSearchBtn.classList.add('hidden');
      renderOrganisations();
    });
  }

  // ==========================================
  // 11. Organisation Selection Handler
  // ==========================================
  function handleOrgSelection(locationObj, orgObj, orgKey) {
    if (orgObj.isIntegrated) {
      // 3. If selected organisation is Integrated:
      // → Open the already created parking dashboard
      localStorage.setItem('slotix_selected_location', JSON.stringify({
        id: locationObj.id || activeLocationId,
        name: locationObj.name,
        city: locationObj.city || '',
        code: locationObj.code || ''
      }));

      localStorage.setItem('slotix_selected_organisation', JSON.stringify({
        id: orgKey,
        locationId: activeLocationId,
        name: orgObj.name,
        code: orgObj.code || '',
        isIntegrated: true
      }));

      if (dom.stepIndicatorDash) dom.stepIndicatorDash.className = 'flow-step active';
      showToast(`Loading ${orgObj.name} Live Dashboard...`, 'success');

      setTimeout(() => {
        window.location.href = 'index.html';
      }, 350);
    } else {
      // 4. If Not Integrated:
      // → Show:
      // “Parking System Not Integrated Yet”
      // “Real-time parking availability is not available for this organisation yet.”
      clickedNotIntegratedOrg = {
        locationId: activeLocationId,
        locationName: locationObj.name,
        orgId: orgKey,
        orgName: orgObj.name
      };

      if (dom.noticeOrgName) dom.noticeOrgName.textContent = orgObj.name;
      if (dom.noticeLocName) dom.noticeLocName.textContent = locationObj.name;

      if (dom.notIntegratedModal) {
        dom.notIntegratedModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
      }
    }
  }

  // Close Not Integrated Modal
  if (dom.closeNotIntegratedBtn) {
    dom.closeNotIntegratedBtn.addEventListener('click', () => {
      if (dom.notIntegratedModal) dom.notIntegratedModal.classList.add('hidden');
      document.body.style.overflow = '';
    });
  }

  if (dom.noticeBackToLocationsBtn) {
    dom.noticeBackToLocationsBtn.addEventListener('click', () => {
      if (dom.notIntegratedModal) dom.notIntegratedModal.classList.add('hidden');
      document.body.style.overflow = '';
      navigateTo('location');
    });
  }

  // Admin Quick Integrate Shortcut from Not Integrated Screen
  if (dom.adminQuickIntegrateBtn) {
    dom.adminQuickIntegrateBtn.addEventListener('click', async () => {
      if (!isAdmin || !clickedNotIntegratedOrg) return;

      const { locationId, locationName, orgId, orgName } = clickedNotIntegratedOrg;
      dom.adminQuickIntegrateBtn.disabled = true;
      dom.adminQuickIntegrateBtn.innerHTML = '<span>Activating IoT Realtime...</span>';

      try {
        await handleToggleOrgStatus(locationId, orgId, true);
        if (dom.notIntegratedModal) dom.notIntegratedModal.classList.add('hidden');
        document.body.style.overflow = '';

        // Store selected org and launch dashboard
        localStorage.setItem('slotix_selected_location', JSON.stringify({
          id: locationId,
          name: locationName
        }));

        localStorage.setItem('slotix_selected_organisation', JSON.stringify({
          id: orgId,
          locationId: locationId,
          name: orgName,
          isIntegrated: true
        }));

        showToast('Organisation Integrated! Launching Dashboard...', 'success');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 400);
      } catch (err) {
        showToast('Failed to update integration status', 'error');
        dom.adminQuickIntegrateBtn.disabled = false;
        dom.adminQuickIntegrateBtn.innerHTML = '<span>Mark as Integrated & Open Dashboard</span>';
      }
    });
  }

  // ==========================================
  // 12. ADMIN CRUD: Location Management
  // ==========================================
  function openAddLocationModal() {
    if (!isAdmin) return;
    if (dom.locFormMode) dom.locFormMode.value = 'add';
    if (dom.locFormId) dom.locFormId.value = '';
    if (dom.locationModalTitle) dom.locationModalTitle.textContent = 'Add New Location';
    if (dom.locNameInput) dom.locNameInput.value = '';
    if (dom.locCityInput) dom.locCityInput.value = '';
    if (dom.locCodeInput) dom.locCodeInput.value = '';
    if (dom.locNameError) dom.locNameError.classList.add('hidden');

    if (dom.locationModal) {
      dom.locationModal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        if (dom.locNameInput) dom.locNameInput.focus();
      }, 100);
    }
  }

  function openEditLocationModal(locationId) {
    if (!isAdmin) return;
    const loc = locationsData[locationId];
    if (!loc) return;

    if (dom.locFormMode) dom.locFormMode.value = 'edit';
    if (dom.locFormId) dom.locFormId.value = locationId;
    if (dom.locationModalTitle) dom.locationModalTitle.textContent = 'Edit Location';
    if (dom.locNameInput) dom.locNameInput.value = loc.name || '';
    if (dom.locCityInput) dom.locCityInput.value = loc.city || '';
    if (dom.locCodeInput) dom.locCodeInput.value = loc.code || '';
    if (dom.locNameError) dom.locNameError.classList.add('hidden');

    if (dom.locationModal) {
      dom.locationModal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        if (dom.locNameInput) dom.locNameInput.focus();
      }, 100);
    }
  }

  function closeLocationModal() {
    if (dom.locationModal) dom.locationModal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  if (dom.openAddLocationModalBtn) {
    dom.openAddLocationModalBtn.addEventListener('click', openAddLocationModal);
  }
  if (dom.emptyAddLocationBtn) {
    dom.emptyAddLocationBtn.addEventListener('click', openAddLocationModal);
  }
  if (dom.closeLocationModalBtn) {
    dom.closeLocationModalBtn.addEventListener('click', closeLocationModal);
  }
  if (dom.cancelLocationBtn) {
    dom.cancelLocationBtn.addEventListener('click', closeLocationModal);
  }

  // Handle Location Form Submission
  if (dom.locationForm) {
    dom.locationForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!isAdmin) return;

      const name = dom.locNameInput ? dom.locNameInput.value.trim() : '';
      const city = dom.locCityInput ? dom.locCityInput.value.trim() : '';
      const code = dom.locCodeInput ? dom.locCodeInput.value.trim().toUpperCase() : '';
      const mode = dom.locFormMode ? dom.locFormMode.value : 'add';
      const locId = dom.locFormId ? dom.locFormId.value : '';

      if (!name) {
        if (dom.locNameError) dom.locNameError.classList.remove('hidden');
        if (dom.locNameInput) dom.locNameInput.focus();
        return;
      }

      closeLocationModal();

      try {
        if (mode === 'add') {
          const locRef = db ? db.ref('/locations').push() : null;
          const newId = locRef ? locRef.key : 'loc_' + Date.now();
          const payload = {
            id: newId,
            name: name,
            city: city,
            code: code,
            createdAt: Date.now()
          };

          if (db) {
            await locRef.set(payload);
          } else {
            // Local fallback
            locationsData[newId] = payload;
            renderLocations();
          }
          showToast(`Location "${name}" added in real-time!`, 'success');
        } else {
          // Edit existing location
          const payload = {
            name: name,
            city: city,
            code: code,
            updatedAt: Date.now()
          };

          if (db) {
            await db.ref(`/locations/${locId}`).update(payload);
          } else {
            if (locationsData[locId]) {
              Object.assign(locationsData[locId], payload);
              renderLocations();
            }
          }
          showToast(`Location "${name}" updated!`, 'success');
        }
      } catch (err) {
        console.error('Error saving location:', err);
        showToast('Error saving to Firebase', 'error');
      }
    });
  }

  // Confirm and Delete Location
  function confirmDeleteLocation(locationId) {
    if (!isAdmin) return;
    const loc = locationsData[locationId];
    if (!loc) return;

    const orgCount = loc.organisations ? Object.keys(loc.organisations).length : 0;
    const confirmMessage = orgCount > 0
      ? `Are you sure you want to delete "${loc.name}"? This will also remove ${orgCount} organisation${orgCount === 1 ? '' : 's'} registered under it.`
      : `Are you sure you want to delete "${loc.name}"?`;

    openDeleteModal(`Delete "${loc.name}"`, confirmMessage, async () => {
      try {
        if (db) {
          await db.ref(`/locations/${locationId}`).remove();
        } else {
          delete locationsData[locationId];
          renderLocations();
        }
        showToast(`Location "${loc.name}" removed`, 'info');
      } catch (err) {
        console.error('Error deleting location:', err);
        showToast('Error deleting from Firebase', 'error');
      }
    });
  }

  // ==========================================
  // 13. ADMIN CRUD: Organisation Management
  // ==========================================
  function openAddOrgModal() {
    if (!isAdmin || !activeLocationId) return;
    const loc = locationsData[activeLocationId];

    if (dom.orgFormMode) dom.orgFormMode.value = 'add';
    if (dom.orgFormId) dom.orgFormId.value = '';
    if (dom.orgModalTitle) dom.orgModalTitle.textContent = 'Add Organisation';
    if (dom.orgModalSubtitle) dom.orgModalSubtitle.textContent = loc ? `Under ${loc.name}` : 'New Organisation';
    if (dom.orgNameInput) dom.orgNameInput.value = '';
    if (dom.orgCodeInput) dom.orgCodeInput.value = '';
    if (dom.radioIntegrated) dom.radioIntegrated.checked = true;
    if (dom.orgNameError) dom.orgNameError.classList.add('hidden');

    if (dom.orgModal) {
      dom.orgModal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        if (dom.orgNameInput) dom.orgNameInput.focus();
      }, 100);
    }
  }

  function openEditOrgModal(locationId, orgId) {
    if (!isAdmin) return;
    const loc = locationsData[locationId];
    if (!loc || !loc.organisations || !loc.organisations[orgId]) return;
    const org = loc.organisations[orgId];

    if (dom.orgFormMode) dom.orgFormMode.value = 'edit';
    if (dom.orgFormId) dom.orgFormId.value = orgId;
    if (dom.orgModalTitle) dom.orgModalTitle.textContent = 'Edit Organisation';
    if (dom.orgModalSubtitle) dom.orgModalSubtitle.textContent = `Under ${loc.name}`;
    if (dom.orgNameInput) dom.orgNameInput.value = org.name || '';
    if (dom.orgCodeInput) dom.orgCodeInput.value = org.code || '';
    if (org.isIntegrated) {
      if (dom.radioIntegrated) dom.radioIntegrated.checked = true;
    } else {
      if (dom.radioNotIntegrated) dom.radioNotIntegrated.checked = true;
    }
    if (dom.orgNameError) dom.orgNameError.classList.add('hidden');

    if (dom.orgModal) {
      dom.orgModal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        if (dom.orgNameInput) dom.orgNameInput.focus();
      }, 100);
    }
  }

  function closeOrgModal() {
    if (dom.orgModal) dom.orgModal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  if (dom.openAddOrgModalBtn) {
    dom.openAddOrgModalBtn.addEventListener('click', openAddOrgModal);
  }
  if (dom.emptyAddOrgBtn) {
    dom.emptyAddOrgBtn.addEventListener('click', openAddOrgModal);
  }
  if (dom.closeOrgModalBtn) {
    dom.closeOrgModalBtn.addEventListener('click', closeOrgModal);
  }
  if (dom.cancelOrgBtn) {
    dom.cancelOrgBtn.addEventListener('click', closeOrgModal);
  }

  // Handle Organisation Form Submission
  if (dom.orgForm) {
    dom.orgForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!isAdmin || !activeLocationId) return;

      const name = dom.orgNameInput ? dom.orgNameInput.value.trim() : '';
      const code = dom.orgCodeInput ? dom.orgCodeInput.value.trim() : '';
      const isIntegrated = dom.radioIntegrated ? dom.radioIntegrated.checked : true;
      const mode = dom.orgFormMode ? dom.orgFormMode.value : 'add';
      const orgId = dom.orgFormId ? dom.orgFormId.value : '';

      if (!name) {
        if (dom.orgNameError) dom.orgNameError.classList.remove('hidden');
        if (dom.orgNameInput) dom.orgNameInput.focus();
        return;
      }

      closeOrgModal();

      try {
        if (mode === 'add') {
          const orgRef = db ? db.ref(`/locations/${activeLocationId}/organisations`).push() : null;
          const newId = orgRef ? orgRef.key : 'org_' + Date.now();
          const payload = {
            id: newId,
            locationId: activeLocationId,
            name: name,
            code: code,
            isIntegrated: isIntegrated,
            createdAt: Date.now()
          };

          if (db) {
            await orgRef.set(payload);
          } else {
            if (!locationsData[activeLocationId].organisations) {
              locationsData[activeLocationId].organisations = {};
            }
            locationsData[activeLocationId].organisations[newId] = payload;
            renderOrganisations();
          }
          showToast(`Organisation "${name}" added!`, 'success');
        } else {
          // Edit existing organisation
          const payload = {
            name: name,
            code: code,
            isIntegrated: isIntegrated,
            updatedAt: Date.now()
          };

          if (db) {
            await db.ref(`/locations/${activeLocationId}/organisations/${orgId}`).update(payload);
          } else {
            if (locationsData[activeLocationId]?.organisations?.[orgId]) {
              Object.assign(locationsData[activeLocationId].organisations[orgId], payload);
              renderOrganisations();
            }
          }
          showToast(`Organisation "${name}" updated!`, 'success');
        }
      } catch (err) {
        console.error('Error saving organisation:', err);
        showToast('Error saving to Firebase', 'error');
      }
    });
  }

  // Toggle Integration Status Directly
  async function handleToggleOrgStatus(locationId, orgId, newStatus) {
    if (!isAdmin) return;
    try {
      if (db) {
        await db.ref(`/locations/${locationId}/organisations/${orgId}`).update({
          isIntegrated: Boolean(newStatus),
          updatedAt: Date.now()
        });
      } else {
        if (locationsData[locationId]?.organisations?.[orgId]) {
          locationsData[locationId].organisations[orgId].isIntegrated = Boolean(newStatus);
          renderOrganisations();
        }
      }
      showToast(newStatus ? 'Marked as Integrated (Live Parking Active)' : 'Marked as Not Integrated', 'info');
    } catch (err) {
      console.error('Error updating status:', err);
      showToast('Error updating status in Firebase', 'error');
      throw err;
    }
  }

  // Confirm and Delete Organisation
  function confirmDeleteOrg(locationId, orgId) {
    if (!isAdmin) return;
    const loc = locationsData[locationId];
    const org = loc?.organisations?.[orgId];
    if (!org) return;

    openDeleteModal(`Delete "${org.name}"`, `Are you sure you want to remove "${org.name}" from ${loc.name}?`, async () => {
      try {
        if (db) {
          await db.ref(`/locations/${locationId}/organisations/${orgId}`).remove();
        } else {
          delete locationsData[locationId].organisations[orgId];
          renderOrganisations();
        }
        showToast(`Organisation "${org.name}" removed`, 'info');
      } catch (err) {
        console.error('Error deleting organisation:', err);
        showToast('Error deleting from Firebase', 'error');
      }
    });
  }

  // ==========================================
  // 14. Delete Confirmation Modal Controller
  // ==========================================
  function openDeleteModal(title, message, onConfirmCallback) {
    if (dom.deleteModalTitle) dom.deleteModalTitle.textContent = title;
    if (dom.deleteConfirmText) dom.deleteConfirmText.textContent = message;
    pendingDeleteAction = onConfirmCallback;

    if (dom.deleteModal) {
      dom.deleteModal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeDeleteModal() {
    if (dom.deleteModal) dom.deleteModal.classList.add('hidden');
    document.body.style.overflow = '';
    pendingDeleteAction = null;
  }

  if (dom.closeDeleteModalBtn) dom.closeDeleteModalBtn.addEventListener('click', closeDeleteModal);
  if (dom.cancelDeleteBtn) dom.cancelDeleteBtn.addEventListener('click', closeDeleteModal);

  if (dom.confirmDeleteBtn) {
    dom.confirmDeleteBtn.addEventListener('click', async () => {
      if (typeof pendingDeleteAction === 'function') {
        const action = pendingDeleteAction;
        closeDeleteModal();
        await action();
      } else {
        closeDeleteModal();
      }
    });
  }

  // Close modals on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeLocationModal();
      closeOrgModal();
      closeDeleteModal();
      if (dom.notIntegratedModal) {
        dom.notIntegratedModal.classList.add('hidden');
        document.body.style.overflow = '';
      }
    }
  });

  // HTML escaping utility for safe rendering
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ==========================================
  // 15. Launch & Initialization
  // ==========================================
  initFirebase();
  navigateTo('location');
});
