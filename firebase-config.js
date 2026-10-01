/**
 * SLOTIX – Firebase Realtime Database Configuration
 * Configured with slotix-a779f credentials
 */

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCdWcSLVVOVBwfBfWb6UGPL_d80RVkWWu4",
  authDomain: "slotix-a779f.firebaseapp.com",
  databaseURL: "https://slotix-a779f-default-rtdb.firebaseio.com",
  projectId: "slotix-a779f",
  storageBucket: "slotix-a779f.firebasestorage.app",
  messagingSenderId: "277391270941",
  appId: "1:277391270941:web:98ef9f7c42eaafcb3052f4",
  measurementId: "G-DCQ6H6D5JH"
};

// Retrieve saved config from localStorage or use default
function getFirebaseConfig() {
  try {
    const saved = localStorage.getItem('slotix_firebase_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      // If user had old placeholder database stored, upgrade to active config
      if (parsed.databaseURL && parsed.databaseURL.includes('slotix-parking-default-rtdb')) {
        return DEFAULT_FIREBASE_CONFIG;
      }
      return { ...DEFAULT_FIREBASE_CONFIG, ...parsed };
    }
  } catch (e) {
    console.warn('Error reading stored Firebase config:', e);
  }
  return DEFAULT_FIREBASE_CONFIG;
}

function saveFirebaseConfig(config) {
  try {
    localStorage.setItem('slotix_firebase_config', JSON.stringify(config));
    return true;
  } catch (e) {
    console.error('Error saving Firebase config:', e);
    return false;
  }
}
