/**
 * SLOTIX – Smart Parking System
 * Mobile-First Login Page Interactions
 * Features: Email Validation, Password Visibility, User Credential Store,
 * and Fully Functional Multi-Step Forgot Password Recovery Workflow.
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements - Main Login Form
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIconSun = document.getElementById('themeIconSun');
  const themeIconMoon = document.getElementById('themeIconMoon');

  const loginForm = document.getElementById('loginForm');
  const usernameInput = document.getElementById('loginUsername');
  const passwordInput = document.getElementById('loginPassword');
  const emailErrorMsg = document.getElementById('emailErrorMsg');
  const passwordErrorMsg = document.getElementById('passwordErrorMsg');

  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const eyeIconShow = document.getElementById('eyeIconShow');
  const eyeIconHide = document.getElementById('eyeIconHide');

  const rememberMeCheckbox = document.getElementById('rememberMe');
  const forgotPasswordLink = document.getElementById('forgotPasswordLink');
  const signInBtn = document.getElementById('signInBtn');
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');

  // DOM Elements - Forgot Password Modal
  const forgotModal = document.getElementById('forgotPasswordModal');
  const closeForgotModalBtn = document.getElementById('closeForgotModalBtn');
  
  // Step indicators & views
  const stepIndicators = [
    document.getElementById('stepIndicator1'),
    document.getElementById('stepIndicator2'),
    document.getElementById('stepIndicator3')
  ];
  const stepLines = [
    document.getElementById('stepLine1'),
    document.getElementById('stepLine2')
  ];
  const stepViews = [
    document.getElementById('forgotStep1'),
    document.getElementById('forgotStep2'),
    document.getElementById('forgotStep3'),
    document.getElementById('forgotStep4')
  ];

  // Step 1 Elements
  const forgotEmailInput = document.getElementById('forgotEmailInput');
  const forgotEmailError = document.getElementById('forgotEmailError');
  const sendResetCodeBtn = document.getElementById('sendResetCodeBtn');

  // Step 2 Elements
  const targetEmailDisplay = document.getElementById('targetEmailDisplay');
  const simulatedOtpCode = document.getElementById('simulatedOtpCode');
  const autoFillOtpBtn = document.getElementById('autoFillOtpBtn');
  const otpInputs = [
    document.getElementById('otp0'),
    document.getElementById('otp1'),
    document.getElementById('otp2'),
    document.getElementById('otp3'),
    document.getElementById('otp4'),
    document.getElementById('otp5')
  ];
  const otpInputsGrid = document.getElementById('otpInputsGrid');
  const forgotOtpError = document.getElementById('forgotOtpError');
  const resendOtpBtn = document.getElementById('resendOtpBtn');
  const resendCountdown = document.getElementById('resendCountdown');
  const backToStep1Btn = document.getElementById('backToStep1Btn');
  const verifyOtpBtn = document.getElementById('verifyOtpBtn');

  // Step 3 Elements
  const newPasswordInput = document.getElementById('newPasswordInput');
  const confirmPasswordInput = document.getElementById('confirmPasswordInput');
  const toggleNewPasswordBtn = document.getElementById('toggleNewPasswordBtn');
  const eyeShowNew = document.getElementById('eyeShowNew');
  const eyeHideNew = document.getElementById('eyeHideNew');
  const toggleConfirmPasswordBtn = document.getElementById('toggleConfirmPasswordBtn');
  const eyeShowConfirm = document.getElementById('eyeShowConfirm');
  const eyeHideConfirm = document.getElementById('eyeHideConfirm');
  const seg1 = document.getElementById('seg1');
  const seg2 = document.getElementById('seg2');
  const seg3 = document.getElementById('seg3');
  const pwdStrengthLabel = document.getElementById('pwdStrengthLabel');
  const newPasswordError = document.getElementById('newPasswordError');
  const saveNewPasswordBtn = document.getElementById('saveNewPasswordBtn');

  // Step 4 Elements
  const finishResetBtn = document.getElementById('finishResetBtn');

  // ==========================================
  // 1. User Credential Store in LocalStorage
  // ==========================================
  const ADMIN_EMAIL = 'gaikwadpruthvi200@gmail.com';
  const ADMIN_DEFAULT_PASS = '12345678';

  function getUserAccounts() {
    try {
      const data = localStorage.getItem('slotix_user_accounts');
      if (data) {
        const parsed = JSON.parse(data);
        if (!parsed[ADMIN_EMAIL.toLowerCase()]) {
          parsed[ADMIN_EMAIL.toLowerCase()] = ADMIN_DEFAULT_PASS;
          localStorage.setItem('slotix_user_accounts', JSON.stringify(parsed));
        }
        return parsed;
      }
    } catch (_) {}
    // Seed default accounts with Master Admin
    const initial = {
      [ADMIN_EMAIL.toLowerCase()]: ADMIN_DEFAULT_PASS,
      'admin@slotix.com': '12345678',
      'demo@slotix.com': 'slotix2026'
    };
    try {
      localStorage.setItem('slotix_user_accounts', JSON.stringify(initial));
    } catch (_) {}
    return initial;
  }

  function saveUserAccount(email, password) {
    try {
      const accounts = getUserAccounts();
      accounts[email.toLowerCase().trim()] = password;
      localStorage.setItem('slotix_user_accounts', JSON.stringify(accounts));
      return true;
    } catch (e) {
      console.error('Error saving user account:', e);
      return false;
    }
  }

  // ==========================================
  // 2. Email & Password Validation Utilities
  // ==========================================
  function isValidEmail(email) {
    if (!email) return false;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(String(email).trim());
  }

  function showFieldValidation(input, errorElement, errorMessage) {
    input.classList.add('input-error');
    input.classList.remove('input-valid');
    if (errorElement) {
      const textSpan = errorElement.querySelector('.error-text');
      if (textSpan && errorMessage) textSpan.textContent = errorMessage;
      errorElement.classList.remove('hidden');
    }
  }

  function clearFieldValidation(input, errorElement, markValid = false) {
    input.classList.remove('input-error');
    if (markValid) {
      input.classList.add('input-valid');
    } else {
      input.classList.remove('input-valid');
    }
    if (errorElement) {
      errorElement.classList.add('hidden');
    }
  }

  function triggerShake(element) {
    element.classList.remove('shake');
    // Trigger reflow
    void element.offsetWidth;
    element.classList.add('shake');
    setTimeout(() => element.classList.remove('shake'), 450);
  }

  // Real-time Email Input Feedback on Main Login Form
  if (usernameInput) {
    usernameInput.addEventListener('input', () => {
      const value = usernameInput.value.trim();
      if (!value) {
        clearFieldValidation(usernameInput, emailErrorMsg, false);
      } else if (isValidEmail(value)) {
        clearFieldValidation(usernameInput, emailErrorMsg, true);
      } else {
        usernameInput.classList.remove('input-valid');
      }
    });

    usernameInput.addEventListener('blur', () => {
      const value = usernameInput.value.trim();
      if (value && !isValidEmail(value)) {
        showFieldValidation(usernameInput, emailErrorMsg, 'Please enter a valid email address (e.g. name@domain.com)');
      } else if (value && isValidEmail(value)) {
        clearFieldValidation(usernameInput, emailErrorMsg, true);
      }
    });
  }

  // Real-time Password Input Feedback
  if (passwordInput) {
    passwordInput.addEventListener('input', () => {
      if (passwordInput.value.length >= 6) {
        clearFieldValidation(passwordInput, passwordErrorMsg, true);
      } else {
        passwordInput.classList.remove('input-valid');
      }
    });
  }

  // ==========================================
  // 3. Theme Management (Shared with Dashboard)
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

  applyTheme(currentTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('slotix_theme', nextTheme);
      applyTheme(nextTheme);
    });
  }

  // ==========================================
  // 4. Remember Me Pre-fill
  // ==========================================
  const savedUser = localStorage.getItem('slotix_remember_user');
  if (usernameInput) {
    if (savedUser) {
      usernameInput.value = savedUser;
      if (isValidEmail(savedUser)) usernameInput.classList.add('input-valid');
      if (rememberMeCheckbox) rememberMeCheckbox.checked = true;
    } else {
      // Default convenience pre-fill for admin testing
      usernameInput.value = ADMIN_EMAIL;
      usernameInput.classList.add('input-valid');
    }
  }

  // ==========================================
  // 5. Password Visibility Toggles
  // ==========================================
  function setupPasswordToggle(toggleBtn, inputField, showIcon, hideIcon) {
    if (!toggleBtn || !inputField) return;
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const isPassword = inputField.getAttribute('type') === 'password';
      if (isPassword) {
        inputField.setAttribute('type', 'text');
        if (showIcon) showIcon.classList.add('hidden');
        if (hideIcon) hideIcon.classList.remove('hidden');
        toggleBtn.title = 'Hide password';
      } else {
        inputField.setAttribute('type', 'password');
        if (showIcon) showIcon.classList.remove('hidden');
        if (hideIcon) hideIcon.classList.add('hidden');
        toggleBtn.title = 'Show password';
      }
      inputField.focus();
    });
  }

  setupPasswordToggle(togglePasswordBtn, passwordInput, eyeIconShow, eyeIconHide);
  setupPasswordToggle(toggleNewPasswordBtn, newPasswordInput, eyeShowNew, eyeHideNew);
  setupPasswordToggle(toggleConfirmPasswordBtn, confirmPasswordInput, eyeShowConfirm, eyeHideConfirm);

  // ==========================================
  // 6. Toast Notification Utility
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
  // 7. Multi-Step Forgot Password Controller
  // ==========================================
  let recoveryState = {
    email: '',
    code: '',
    expiresAt: 0,
    resendInterval: null,
    countdown: 30,
    currentStep: 1,
    savedNewPassword: ''
  };

  function openForgotModal() {
    recoveryState.email = '';
    recoveryState.code = '';
    recoveryState.savedNewPassword = '';

    // Pre-fill email from login form if valid
    const currentInputEmail = usernameInput ? usernameInput.value.trim() : '';
    if (forgotEmailInput) {
      if (isValidEmail(currentInputEmail)) {
        forgotEmailInput.value = currentInputEmail;
        clearFieldValidation(forgotEmailInput, forgotEmailError, true);
      } else {
        forgotEmailInput.value = '';
        clearFieldValidation(forgotEmailInput, forgotEmailError, false);
      }
    }

    goToStep(1);
    if (forgotModal) {
      forgotModal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        if (forgotEmailInput) forgotEmailInput.focus();
      }, 100);
    }
  }

  function closeForgotModal() {
    if (recoveryState.resendInterval) {
      clearInterval(recoveryState.resendInterval);
      recoveryState.resendInterval = null;
    }
    if (forgotModal) {
      forgotModal.classList.add('hidden');
      document.body.style.overflow = '';
    }
  }

  function goToStep(stepNumber) {
    recoveryState.currentStep = stepNumber;

    // Switch step views
    stepViews.forEach((view, index) => {
      if (!view) return;
      if (index + 1 === stepNumber) {
        view.classList.remove('hidden');
      } else {
        view.classList.add('hidden');
      }
    });

    // Update progress indicators
    stepIndicators.forEach((indicator, index) => {
      if (!indicator) return;
      indicator.classList.remove('active', 'done');
      if (index + 1 < stepNumber) {
        indicator.classList.add('done');
      } else if (index + 1 === stepNumber) {
        indicator.classList.add('active');
      }
    });

    stepLines.forEach((line, index) => {
      if (!line) return;
      if (index + 1 < stepNumber) {
        line.classList.add('active');
      } else {
        line.classList.remove('active');
      }
    });
  }

  // Forgot password link click
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
      e.preventDefault();
      openForgotModal();
    });
  }

  if (closeForgotModalBtn) {
    closeForgotModalBtn.addEventListener('click', closeForgotModal);
  }

  // Backdrop click & Escape key listener
  if (forgotModal) {
    forgotModal.addEventListener('click', (e) => {
      if (e.target === forgotModal) {
        closeForgotModal();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !forgotModal.classList.contains('hidden')) {
        closeForgotModal();
      }
    });
  }

  // ------------------------------------------
  // Step 1: Send Reset Code
  // ------------------------------------------
  if (forgotEmailInput) {
    forgotEmailInput.addEventListener('input', () => {
      if (isValidEmail(forgotEmailInput.value.trim())) {
        clearFieldValidation(forgotEmailInput, forgotEmailError, true);
      }
    });
  }

  function startResendTimer() {
    if (recoveryState.resendInterval) clearInterval(recoveryState.resendInterval);
    recoveryState.countdown = 30;
    if (resendOtpBtn) resendOtpBtn.disabled = true;
    if (resendCountdown) resendCountdown.textContent = recoveryState.countdown;

    recoveryState.resendInterval = setInterval(() => {
      recoveryState.countdown--;
      if (resendCountdown) resendCountdown.textContent = recoveryState.countdown;
      if (recoveryState.countdown <= 0) {
        clearInterval(recoveryState.resendInterval);
        recoveryState.resendInterval = null;
        if (resendOtpBtn) {
          resendOtpBtn.disabled = false;
          resendOtpBtn.innerHTML = 'Resend Code Now';
        }
      }
    }, 1000);
  }

  function generateAndSendCode(email) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    recoveryState.email = email;
    recoveryState.code = code;
    recoveryState.expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    if (targetEmailDisplay) targetEmailDisplay.textContent = email;
    if (simulatedOtpCode) simulatedOtpCode.textContent = code;

    // Reset OTP boxes
    otpInputs.forEach((box) => {
      if (box) {
        box.value = '';
        box.classList.remove('input-error');
      }
    });
    if (forgotOtpError) forgotOtpError.classList.add('hidden');

    goToStep(2);
    startResendTimer();
    showToast(`Verification code sent to ${email}`, 'success');

    setTimeout(() => {
      if (otpInputs[0]) otpInputs[0].focus();
    }, 150);
  }

  if (sendResetCodeBtn) {
    sendResetCodeBtn.addEventListener('click', () => {
      const email = forgotEmailInput ? forgotEmailInput.value.trim() : '';

      if (!isValidEmail(email)) {
        showFieldValidation(forgotEmailInput, forgotEmailError, 'Please enter a valid email address');
        if (forgotEmailInput) triggerShake(forgotEmailInput);
        return;
      }

      sendResetCodeBtn.disabled = true;
      const originalText = sendResetCodeBtn.innerHTML;
      sendResetCodeBtn.innerHTML = '<span>Dispatching Code...</span>';

      setTimeout(() => {
        sendResetCodeBtn.disabled = false;
        sendResetCodeBtn.innerHTML = originalText;
        generateAndSendCode(email);
      }, 400);
    });
  }

  // ------------------------------------------
  // Step 2: OTP Entry & Verification
  // ------------------------------------------
  if (autoFillOtpBtn) {
    autoFillOtpBtn.addEventListener('click', () => {
      if (!recoveryState.code) return;
      const digits = recoveryState.code.split('');
      otpInputs.forEach((input, i) => {
        if (input && digits[i]) input.value = digits[i];
      });
      if (forgotOtpError) forgotOtpError.classList.add('hidden');
      showToast('Code auto-filled!', 'info');
      if (otpInputs[5]) otpInputs[5].focus();
    });
  }

  // OTP Box Navigation & Paste Handler
  otpInputs.forEach((input, index) => {
    if (!input) return;

    input.addEventListener('input', (e) => {
      const val = input.value.replace(/[^0-9]/g, '');
      input.value = val ? val[0] : '';
      if (input.value && index < 5 && otpInputs[index + 1]) {
        otpInputs[index + 1].focus();
      }
      if (forgotOtpError) forgotOtpError.classList.add('hidden');
      otpInputs.forEach((b) => b && b.classList.remove('input-error'));
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && index > 0 && otpInputs[index - 1]) {
        otpInputs[index - 1].focus();
      } else if (e.key === 'Enter') {
        if (verifyOtpBtn) verifyOtpBtn.click();
      }
    });

    // Handle Paste on any OTP box
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasteData = (e.clipboardData || window.clipboardData).getData('text').trim().replace(/[^0-9]/g, '');
      if (pasteData.length >= 6) {
        const digits = pasteData.slice(0, 6).split('');
        otpInputs.forEach((box, i) => {
          if (box && digits[i]) box.value = digits[i];
        });
        if (otpInputs[5]) otpInputs[5].focus();
        if (forgotOtpError) forgotOtpError.classList.add('hidden');
      }
    });
  });

  if (backToStep1Btn) {
    backToStep1Btn.addEventListener('click', () => {
      goToStep(1);
      if (forgotEmailInput) forgotEmailInput.focus();
    });
  }

  if (resendOtpBtn) {
    resendOtpBtn.addEventListener('click', () => {
      if (recoveryState.countdown > 0) return;
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      recoveryState.code = code;
      recoveryState.expiresAt = Date.now() + 10 * 60 * 1000;
      if (simulatedOtpCode) simulatedOtpCode.textContent = code;
      startResendTimer();
      showToast('A fresh verification code was generated', 'info');
    });
  }

  function getEnteredOtp() {
    return otpInputs.map((box) => (box ? box.value.trim() : '')).join('');
  }

  if (verifyOtpBtn) {
    verifyOtpBtn.addEventListener('click', () => {
      const enteredCode = getEnteredOtp();

      if (enteredCode.length < 6) {
        if (forgotOtpError) {
          const textSpan = forgotOtpError.querySelector('.error-text');
          if (textSpan) textSpan.textContent = 'Please enter all 6 digits of the code';
          forgotOtpError.classList.remove('hidden');
        }
        if (otpInputsGrid) triggerShake(otpInputsGrid);
        return;
      }

      if (Date.now() > recoveryState.expiresAt) {
        if (forgotOtpError) {
          const textSpan = forgotOtpError.querySelector('.error-text');
          if (textSpan) textSpan.textContent = 'Code expired. Please tap Resend to get a fresh code.';
          forgotOtpError.classList.remove('hidden');
        }
        if (otpInputsGrid) triggerShake(otpInputsGrid);
        return;
      }

      if (enteredCode !== recoveryState.code) {
        if (forgotOtpError) {
          const textSpan = forgotOtpError.querySelector('.error-text');
          if (textSpan) textSpan.textContent = 'Invalid verification code. Please check and try again.';
          forgotOtpError.classList.remove('hidden');
        }
        otpInputs.forEach((box) => box && box.classList.add('input-error'));
        if (otpInputsGrid) triggerShake(otpInputsGrid);
        return;
      }

      // Verification Success!
      showToast('Code verified successfully!', 'success');
      goToStep(3);

      setTimeout(() => {
        if (newPasswordInput) newPasswordInput.focus();
      }, 150);
    });
  }

  // ------------------------------------------
  // Step 3: New Password Creation & Strength
  // ------------------------------------------
  function calculatePasswordStrength(pwd) {
    if (!pwd) return { score: 0, label: 'Strength: Enter password', color: '' };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 8 && /[0-9]/.test(pwd) && /[a-zA-Z]/.test(pwd)) score++;
    if (pwd.length >= 9 && /[^a-zA-Z0-9]/.test(pwd)) score++;

    if (score === 1) {
      return { score: 1, label: 'Strength: Weak (min 6 chars)', color: '#ef4444' };
    } else if (score === 2) {
      return { score: 2, label: 'Strength: Medium (good mix)', color: '#f59e0b' };
    } else if (score >= 3) {
      return { score: 3, label: 'Strength: Strong & Secure', color: '#10b981' };
    }
    return { score: 1, label: 'Strength: Weak', color: '#ef4444' };
  }

  function updateStrengthMeter(pwd) {
    const strength = calculatePasswordStrength(pwd);
    if (pwdStrengthLabel) pwdStrengthLabel.textContent = strength.label;

    const segments = [seg1, seg2, seg3];
    segments.forEach((seg, i) => {
      if (!seg) return;
      if (i < strength.score) {
        seg.style.backgroundColor = strength.color;
      } else {
        seg.style.backgroundColor = 'var(--border-input)';
      }
    });
  }

  if (newPasswordInput) {
    newPasswordInput.addEventListener('input', () => {
      updateStrengthMeter(newPasswordInput.value);
      if (newPasswordError) newPasswordError.classList.add('hidden');
      newPasswordInput.classList.remove('input-error');
    });
  }

  if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener('input', () => {
      if (newPasswordError) newPasswordError.classList.add('hidden');
      confirmPasswordInput.classList.remove('input-error');
    });
  }

  if (saveNewPasswordBtn) {
    saveNewPasswordBtn.addEventListener('click', () => {
      const newPwd = newPasswordInput ? newPasswordInput.value : '';
      const confirmPwd = confirmPasswordInput ? confirmPasswordInput.value : '';

      if (newPwd.length < 6) {
        if (newPasswordError) {
          const textSpan = newPasswordError.querySelector('.error-text');
          if (textSpan) textSpan.textContent = 'Password must be at least 6 characters long';
          newPasswordError.classList.remove('hidden');
        }
        if (newPasswordInput) {
          newPasswordInput.classList.add('input-error');
          triggerShake(newPasswordInput);
        }
        return;
      }

      if (newPwd !== confirmPwd) {
        if (newPasswordError) {
          const textSpan = newPasswordError.querySelector('.error-text');
          if (textSpan) textSpan.textContent = 'Passwords do not match. Please verify.';
          newPasswordError.classList.remove('hidden');
        }
        if (confirmPasswordInput) {
          confirmPasswordInput.classList.add('input-error');
          triggerShake(confirmPasswordInput);
        }
        return;
      }

      // Save new password for this user
      saveUserAccount(recoveryState.email, newPwd);
      recoveryState.savedNewPassword = newPwd;

      // Advance to celebration step
      goToStep(4);
    });
  }

  // ------------------------------------------
  // Step 4: Finish & Return to Sign In
  // ------------------------------------------
  if (finishResetBtn) {
    finishResetBtn.addEventListener('click', () => {
      closeForgotModal();

      // Pre-fill the login form with reset credentials
      if (usernameInput) {
        usernameInput.value = recoveryState.email;
        clearFieldValidation(usernameInput, emailErrorMsg, true);
      }
      if (passwordInput) {
        passwordInput.value = recoveryState.savedNewPassword;
        clearFieldValidation(passwordInput, passwordErrorMsg, true);
      }

      showToast('Password updated! Tap Sign In to proceed.', 'success');
      if (signInBtn) {
        signInBtn.focus();
        triggerShake(signInBtn);
      }
    });
  }

  // ==========================================
  // 8. Sign In Form Submission with Validation
  // ==========================================
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = usernameInput ? usernameInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';

      let hasError = false;

      // 1. Email validation
      if (!email) {
        showFieldValidation(usernameInput, emailErrorMsg, 'Please enter your email address');
        if (usernameInput) triggerShake(usernameInput);
        hasError = true;
      } else if (!isValidEmail(email)) {
        showFieldValidation(usernameInput, emailErrorMsg, 'Please enter a valid email address (e.g. user@slotix.com)');
        if (usernameInput) triggerShake(usernameInput);
        hasError = true;
      } else {
        clearFieldValidation(usernameInput, emailErrorMsg, true);
      }

      // 2. Password validation
      if (!password) {
        showFieldValidation(passwordInput, passwordErrorMsg, 'Please enter your password');
        if (passwordInput && !hasError) triggerShake(passwordInput);
        hasError = true;
      } else if (password.length < 6) {
        showFieldValidation(passwordInput, passwordErrorMsg, 'Password must be at least 6 characters');
        if (passwordInput && !hasError) triggerShake(passwordInput);
        hasError = true;
      } else {
        clearFieldValidation(passwordInput, passwordErrorMsg, true);
      }

      if (hasError) {
        showToast('Please fix the errors above', 'error');
        return;
      }

      // 3. User account authentication check
      const accounts = getUserAccounts();
      const normalizedEmail = email.toLowerCase();

      if (accounts[normalizedEmail]) {
        // Existing account: check password match
        if (accounts[normalizedEmail] !== password) {
          showFieldValidation(passwordInput, passwordErrorMsg, 'Incorrect password. Click Forgot Password to reset.');
          triggerShake(passwordInput);
          showToast('Incorrect password for this account', 'error');
          return;
        }
      } else {
        // Register new credentials seamlessly
        saveUserAccount(normalizedEmail, password);
      }

      // 4. Remember Me Handling
      if (rememberMeCheckbox && rememberMeCheckbox.checked) {
        localStorage.setItem('slotix_remember_user', email);
      } else {
        localStorage.removeItem('slotix_remember_user');
      }

      // 5. Set session flags and admin role
      const isAdmin = normalizedEmail === ADMIN_EMAIL.toLowerCase();
      localStorage.setItem('slotix_logged_in', 'true');
      localStorage.setItem('slotix_current_user', email);
      localStorage.setItem('slotix_is_admin', isAdmin ? 'true' : 'false');

      // 6. UI feedback and redirect
      if (signInBtn) {
        signInBtn.disabled = true;
        const btnText = signInBtn.querySelector('.btn-text');
        if (btnText) btnText.textContent = 'Signing in...';
        signInBtn.style.opacity = '0.85';
      }

      showToast('Access Granted! Redirecting to Location Selection...', 'success');

      setTimeout(() => {
        window.location.href = 'select.html';
      }, 500);
    });
  }
});
