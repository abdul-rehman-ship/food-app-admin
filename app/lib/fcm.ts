// admin/lib/fcm.ts
import { messaging, db } from './firebase';
import { getToken } from 'firebase/messaging';
import { ref, update, get } from 'firebase/database';

// Register service worker
const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | undefined> => {
  if (typeof window === 'undefined') return undefined;
  
  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    console.log('Service Worker registered successfully:', registration);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return undefined;
  }
};

// Get and store FCM token
export const getAndStoreFCMToken = async (userId: string) => {
  try {
    console.log('getAndStoreFCMToken called for userId:', userId);
    
    if (typeof window === 'undefined') {
      return null;
    }

    if (!('Notification' in window) || !messaging) {
      console.log('FCM not available');
      return null;
    }

    // Check if user already has a token in database
    const userRef = ref(db, `users/${userId}`);
    const snapshot = await get(userRef);
    const existingToken = snapshot.val()?.fcmToken;
    
    if (existingToken) {
      console.log('User already has FCM token');
      return existingToken;
    }

    // Check permission
    if (Notification.permission !== 'granted') {
      console.log('Notification permission not granted');
      return null;
    }

    // Ensure service worker is registered
    await registerServiceWorker();

    // Get FCM token
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY
    });

    if (token) {
      await update(userRef, {
        fcmToken: token,
        fcmTokenUpdatedAt: Date.now()
      });
      console.log('FCM token stored successfully for user:', userId);
      return token;
    } else {
      console.log('No registration token available');
      return null;
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

// Remove FCM token
export const removeFCMToken = async (userId: string) => {
  try {
    const userRef = ref(db, `users/${userId}`);
    await update(userRef, {
      fcmToken: null,
      fcmTokenRemovedAt: Date.now()
    });
    console.log('FCM token removed for user:', userId);
  } catch (error) {
    console.error('Error removing FCM token:', error);
  }
};