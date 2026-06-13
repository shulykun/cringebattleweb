import { registerPlugin } from '@capacitor/core';

const RuStorePush = registerPlugin('RuStorePush');

export default RuStorePush;

// Listen for push events (only in Capacitor app)
export function initPushNotifications(onToken, onMessage) {
  try {
    RuStorePush.addListener('pushToken', (event) => {
      console.log('[RuStore Push] Token:', event.token);
      if (onToken) onToken(event.token);
      sendTokenToBackend(event.token);
    });

    RuStorePush.addListener('pushReceived', (event) => {
      console.log('[RuStore Push] Message:', event);
      if (onMessage) onMessage(event);
    });
  } catch (e) {
    // Not in Capacitor app — silently ignore
  }
}

async function sendTokenToBackend(token) {
  try {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    await fetch('/api/push-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, token, provider: 'rustore' }),
    });
  } catch (e) {
    console.error('[Push] Failed to register token:', e);
  }
}
