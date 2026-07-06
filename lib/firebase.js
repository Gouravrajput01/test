import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import { getDatabase, ref, set, get, update, push } from 'firebase/database';

// =============================================
// FIREBASE CONFIG (FROM .env.local)
// =============================================
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase (singleton)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const database = getDatabase(app);
const provider = new GoogleAuthProvider();

// =============================================
// AUTH FUNCTIONS
// =============================================

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    await set(ref(database, `users/${user.uid}`), {
      name: user.displayName,
      email: user.email,
      photo: user.photoURL,
      uid: user.uid,
      createdAt: Date.now(),
      totalViolations: 0
    });

    return { success: true, user };
  } catch (error) {
    console.error('Sign-in error:', error);
    return { success: false, error: error.message };
  }
};

export const getCurrentUser = () => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// =============================================
// DATABASE FUNCTIONS
// =============================================

export const logViolation = async (userId, violationData) => {
  try {
    const violationRef = push(ref(database, `violations/${userId}`));
    await set(violationRef, {
      ...violationData,
      timestamp: Date.now(),
      id: violationRef.key
    });

    const userRef = ref(database, `users/${userId}`);
    const snapshot = await get(userRef);
    if (snapshot.exists()) {
      const currentData = snapshot.val();
      const currentCount = currentData.totalViolations || 0;
      await update(userRef, {
        totalViolations: currentCount + 1,
        lastViolation: violationData.type,
        lastViolationTime: Date.now()
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error logging violation:', error);
    return { success: false, error: error.message };
  }
};

export const getUserViolations = async (userId) => {
  try {
    const violationsRef = ref(database, `violations/${userId}`);
    const snapshot = await get(violationsRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.values(data);
    }
    return [];
  } catch (error) {
    console.error('Error fetching violations:', error);
    return [];
  }
};

export const getUserData = async (userId) => {
  try {
    const userRef = ref(database, `users/${userId}`);
    const snapshot = await get(userRef);
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    console.error('Error fetching user data:', error);
    return null;
  }
};

export const startExamSession = async (userId, examData) => {
  try {
    const sessionRef = push(ref(database, `sessions/${userId}`));
    await set(sessionRef, {
      ...examData,
      sessionId: sessionRef.key,
      startTime: Date.now(),
      status: 'active'
    });
    return { success: true, sessionId: sessionRef.key };
  } catch (error) {
    console.error('Error starting session:', error);
    return { success: false, error: error.message };
  }
};

export const endExamSession = async (userId, sessionId) => {
  try {
    const sessionRef = ref(database, `sessions/${userId}/${sessionId}`);
    await update(sessionRef, {
      status: 'completed',
      endTime: Date.now()
    });
    return { success: true };
  } catch (error) {
    console.error('Error ending session:', error);
    return { success: false, error: error.message };
  }
};

export { auth, database, provider };
