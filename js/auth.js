import { auth, googleProvider, db } from './firebase-config.js';
import { 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// DOM Elements
let loginModal, signupModal, profileModal;
let authButtonsContainer, userProfileContainer, userNameDisplay;

document.addEventListener('DOMContentLoaded', () => {
  loginModal = document.getElementById('login-modal');
  signupModal = document.getElementById('signup-modal');
  profileModal = document.getElementById('profile-modal');
  authButtonsContainer = document.getElementById('auth-buttons');
  userProfileContainer = document.getElementById('user-profile-btn');
  userNameDisplay = document.getElementById('user-name-display');

  // Setup Event Listeners
  setupEventListeners();
  
  // Listen for auth state changes
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // User is signed in
      authButtonsContainer.classList.add('hidden');
      userProfileContainer.classList.remove('hidden');
      userNameDisplay.textContent = user.displayName || user.email.split('@')[0];
      
      // Ensure user doc exists
      await ensureUserDocument(user);
    } else {
      // User is signed out
      authButtonsContainer.classList.remove('hidden');
      userProfileContainer.classList.add('hidden');
    }
  });
});

async function ensureUserDocument(user) {
  const userRef = doc(db, "users", user.uid);
  const docSnap = await getDoc(userRef);
  
  if (!docSnap.exists()) {
    // Create new user profile
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email.split('@')[0],
      points: 0,
      badges: [],
      createdAt: new Date().toISOString(),
      geminiApiKey: ""
    });
  } else {
    // Load existing profile data (like Gemini API key) into localStorage for easy access
    const userData = docSnap.data();
    if (userData.geminiApiKey) {
      localStorage.setItem('geminiApiKey', userData.geminiApiKey);
      const apiKeyInput = document.getElementById('gemini-api-key-input');
      if(apiKeyInput) apiKeyInput.value = userData.geminiApiKey;
    }
  }
}

function setupEventListeners() {
  // Modal Toggles
  document.getElementById('open-login-btn')?.addEventListener('click', () => {
    loginModal.classList.remove('hidden');
  });
  
  document.getElementById('open-signup-btn')?.addEventListener('click', () => {
    loginModal.classList.add('hidden');
    signupModal.classList.remove('hidden');
  });

  document.getElementById('open-signup-from-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    loginModal.classList.add('hidden');
    signupModal.classList.remove('hidden');
  });

  document.getElementById('open-login-from-signup')?.addEventListener('click', (e) => {
    e.preventDefault();
    signupModal.classList.add('hidden');
    loginModal.classList.remove('hidden');
  });

  document.querySelectorAll('.close-modal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      loginModal.classList.add('hidden');
      signupModal.classList.add('hidden');
      profileModal.classList.add('hidden');
    });
  });

  userProfileContainer?.addEventListener('click', () => {
    profileModal.classList.remove('hidden');
  });

  // Auth Actions
  document.getElementById('google-login-btn')?.addEventListener('click', async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      loginModal.classList.add('hidden');
    } catch (error) {
      alert(error.message);
    }
  });

  document.getElementById('google-signup-btn')?.addEventListener('click', async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      signupModal.classList.add('hidden');
    } catch (error) {
      alert(error.message);
    }
  });

  document.getElementById('email-login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;
    try {
      await signInWithEmailAndPassword(auth, email, password);
      loginModal.classList.add('hidden');
    } catch (error) {
      alert(error.message);
    }
  });

  document.getElementById('email-signup-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      signupModal.classList.add('hidden');
    } catch (error) {
      alert(error.message);
    }
  });

  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    try {
      await signOut(auth);
      profileModal.classList.add('hidden');
      localStorage.removeItem('geminiApiKey');
    } catch (error) {
      alert(error.message);
    }
  });

  // Save API Key
  document.getElementById('save-api-key-btn')?.addEventListener('click', async () => {
    const key = document.getElementById('gemini-api-key-input').value;
    const user = auth.currentUser;
    
    // Always save locally first so the app works regardless of Firebase permissions
    localStorage.setItem('geminiApiKey', key);
    
    if (user) {
      try {
        await setDoc(doc(db, "users", user.uid), { geminiApiKey: key }, { merge: true });
        alert('API Key saved successfully and synced to cloud!');
      } catch(error) {
        console.error("Firestore sync error:", error);
        alert('API Key saved locally and is ready to use!\n\n(Note: Cloud sync failed. If you want it to sync across devices, please check your Firestore Security Rules in the Firebase Console.)');
      }
    } else {
      alert('API Key saved locally. (Log in to sync across devices)');
    }
  });
}
