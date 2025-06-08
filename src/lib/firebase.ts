import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyB0ysCXaS4Ck_2mdii_D2bVTol1H55ABnA",
  authDomain: "interchat-d7457.firebaseapp.com",
  databaseURL: "https://interchat-d7457-default-rtdb.firebaseio.com",
  projectId: "interchat-d7457",
  storageBucket: "interchat-d7457.firebasestorage.app",
  messagingSenderId: "1066336384398",
  appId: "1:1066336384398:web:e9615f2c8836a68e97e0df",
  measurementId: "G-Z9BK0WRVJX"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const functions = getFunctions(app);

// Initialize Analytics only in browser environment
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export default app; 