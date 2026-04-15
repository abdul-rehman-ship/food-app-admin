import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, push, remove, update } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const firebaseConfig = {
  // YOUR FIREBASE CONFIG HERE
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const storage = getStorage(app);

// Helper functions
export const checkAdminKey = async (key: string): Promise<boolean> => {
  const adminKeyRef = ref(db, 'admin_key');
  const snapshot = await get(adminKeyRef);
  return snapshot.exists() && snapshot.val() === key;
};

export const setAdminKey = async (key: string): Promise<void> => {
  const adminKeyRef = ref(db, 'admin_key');
  await set(adminKeyRef, key);
};