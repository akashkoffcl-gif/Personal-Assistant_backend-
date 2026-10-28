'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);

      // Register Service Worker
      navigator.serviceWorker
        .register('/sw.js')
        .then(async (reg) => {
          const sub = await reg.pushManager.getSubscription();
          setIsSubscribed(!!sub);
        })
        .catch((err) => {
          console.warn('SW registration error:', err);
        });
    }
  }, []);

  const subscribe = async () => {
    if (!isSupported) {
      setMessage('Web Push is not supported in this browser.');
      return;
    }

    try {
      setLoading(true);
      setMessage(null);

      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        setMessage('Notification permission was denied.');
        setLoading(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const { publicKey } = await api.getVapidPublicKey();

      if (!publicKey) {
        throw new Error('VAPID public key unavailable.');
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const jsonSub = sub.toJSON();
      await api.subscribePush({
        endpoint: sub.endpoint,
        keys: {
          p256dh: jsonSub.keys?.p256dh || '',
          auth: jsonSub.keys?.auth || '',
        },
        deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        userAgent: navigator.userAgent,
      });

      setIsSubscribed(true);
      setMessage('Push notifications enabled successfully!');
    } catch (err: any) {
      console.error('Subscription error:', err);
      setMessage(`Push subscription failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testNotification = async () => {
    try {
      setLoading(true);
      await api.sendTestPush();
      setMessage('Test notification dispatched!');
    } catch (err: any) {
      setMessage(`Test notification failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return {
    isSupported,
    permission,
    isSubscribed,
    loading,
    message,
    subscribe,
    testNotification,
  };
}
