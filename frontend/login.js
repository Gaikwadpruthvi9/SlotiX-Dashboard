/**
 * SLOTIX – Smart Parking System
 * Mobile-First Login Page Interactions
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIconSun = document.getElementById('themeIconSun');
  const themeIconMoon = document.getElementById('themeIconMoon');

  const loginForm = document.getElementById('loginForm');
  const usernameInput = document.getElementById('loginUsername');
  const passwordInput = document.getElementById('loginPassword');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const eyeIconShow = document.getElementById('eyeIconShow');
  const eyeIconHide = document.getElementById('eyeIconHide');

  const rememberMeCheckbox = document.getElementById('rememberMe');
  const forgotPasswordLink = document.getElementById('forgotPasswordLink');
  const signInBtn = document.getElementById('signInBtn');
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');

  // ==========================================
  // 1. Theme Management (Shared with Dashboard)
  // ==========================================
  let currentTheme = localStorage.getItem('slotix_theme') || 'dark';

  function applyTheme(theme) {
    currentTheme = theme;
    if (theme === 'light') {
      document.body.classList.add('light-mode');
      if (themeIconSun) themeIconSun.classList.add('hidden');
      if (themeIconMoon) themeIconMoon.classList.remove('hidden');
      if (themeToggleBtn) themeToggleBtn.title = 'Switch to Dark Mode';
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#f0f4f9');
    } else {
      document.body.classList.remove('light-mode');
      if (themeIconSun) themeIconSun.classList.remove('hidden');
      if (themeIconMoon) themeIconMoon.classList.add('hidden');
      if (themeToggleBtn) themeToggleBtn.title = 'Switch to Light Mode';
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#0a101d');
    }
  }

  // Initial theme application
  applyTheme(currentTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('slotix_theme', nextTheme);
      applyTheme(nextTheme);
    });
  }

  // ==========================================
  // 2. Remember Me Pre-fill
  // ==========================================
  const savedUser = localStorage.getItem('slotix_remember_user');
  if (savedUser && usernameInput) {
    usernameInput.value = savedUser;
    if (rememberMeCheckbox) rememberMeCheckbox.checked = true;
  }

  // ==========================================
  // 3. Password Visibility Toggle
  // ==========================================
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const isPassword = passwordInput.getAttribute('type') === 'password';
      if (isPassword) {
        passwordInput.setAttribute('type', 'text');
        if (eyeIconShow) eyeIconShow.classList.add('hidden');
        if (eyeIconHide) eyeIconHide.classList.remove('hidden');
        togglePasswordBtn.title = 'Hide password';
        togglePasswordBtn.setAttribute('aria-label', 'Hide password');
      } else {
        passwordInput.setAttribute('type', 'password');
        if (eyeIconShow) eyeIconShow.classList.remove('hidden');
        if (eyeIconHide) eyeIconHide.classList.add('hidden');
        togglePasswordBtn.title = 'Show password';
        togglePasswordBtn.setAttribute('aria-label', 'Show password');
      }
      passwordInput.focus();
    });
  }

  // ==========================================
  // 4. Toast Notification Utility
  // ==========================================
  function showToast(message, type = 'info') {
    let toast = document.getElementById('loginToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'loginToast';
      toast.className = 'login-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = `login-toast show ${type}`;
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.className = 'login-toast';
    }, 3200);
  }

  // ==========================================
  // 5. Forgot Password Handler
  // ==========================================
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
      e.preventDefault();
      const currentEmail = usernameInput ? usernameInput.value.trim() : '';
      if (currentEmail) {
        showToast(`Reset instructions sent to ${currentEmail}`, 'success');
      } else {
        showToast('Please enter your email or username first to reset password', 'info');
        if (usernameInput) usernameInput.focus();
      }
    });
  }

  // ==========================================
  // 6. Sign In Form Submission
  // ==========================================
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = usernameInput ? usernameInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';

      if (!username) {
        showToast('Please enter your email or username', 'error');
        if (usernameInput) usernameInput.focus();
        return;
      }

      if (!password) {
        showToast('Please enter your password', 'error');
        if (passwordInput) passwordInput.focus();
        return;
      }

      // Handle Remember Me
      if (rememberMeCheckbox && rememberMeCheckbox.checked) {
        localStorage.setItem('slotix_remember_user', username);
      } else {
        localStorage.removeItem('slotix_remember_user');
      }

      // Set logged in session flag
      localStorage.setItem('slotix_logged_in', 'true');
      localStorage.setItem('slotix_current_user', username);

      // Submit feedback button animation
      if (signInBtn) {
        signInBtn.disabled = true;
        const btnText = signInBtn.querySelector('.btn-text');
        if (btnText) btnText.textContent = 'Signing in...';
        signInBtn.style.opacity = '0.85';
      }

      showToast('Access Granted! Redirecting to Dashboard...', 'success');

      setTimeout(() => {
        window.location.href = 'index.html';
      }, 550);
    });
  }
});
