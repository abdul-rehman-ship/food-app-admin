import { getMessaging, getToken } from 'firebase/messaging';
import { app } from './firebase';

let messaging: any = null;

if (typeof window !== 'undefined') {
  try {
    messaging = getMessaging(app);
  } catch (error) {
    console.error('Error initializing messaging:', error);
  }
}

// Send push notification to user
export const sendPushNotification = async (fcmToken: string, title: string, body: string, data?: any) => {
  try {
    // This is a server-side function - you'll need a backend endpoint
    // For now, we'll use a Firebase Cloud Function or a third-party service
    
    const response = await fetch('/api/send-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: fcmToken,
        notification: {
          title,
          body,
        },
        data: data || {},
      }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return null;
  }
};