import { NextRequest, NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';

// Initialize GoogleAuth with service account credentials
let auth: GoogleAuth | null = null;

function getAuthClient() {
  if (!auth) {
    auth = new GoogleAuth({
      credentials: {
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        project_id: process.env.FIREBASE_PROJECT_ID,
      },
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });
  }
  return auth;
}

export async function POST(request: NextRequest) {
  try {
    const { token, title, body, orderId } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'No FCM token provided' }, { status: 400 });
    }

    // Get access token using service account
    const authClient = getAuthClient();
    const client = await authClient.getClient();
    const accessToken = await client.getAccessToken();

    const projectId = process.env.FIREBASE_PROJECT_ID;
    
    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken.token}`,
      },
      body: JSON.stringify({
        message: {
          token: token,
          notification: {
            title: title,
            body: body,
          },
          webpush: {
            fcm_options: {
              link: 'https://berthas-food-client.web.app/orders',
            },
          },
        },
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('FCM Error:', data);
      return NextResponse.json({ error: data }, { status: response.status });
    }

    console.log('Notification sent successfully:', data);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}