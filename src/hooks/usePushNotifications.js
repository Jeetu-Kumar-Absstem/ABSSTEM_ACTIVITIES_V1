import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../utils/supabase';

export const usePushNotifications = (user) => {
  useEffect(() => {
    if (!user || Capacitor.getPlatform() === 'web') return;

    const registerPush = async () => {
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('Push notification permission not granted');
        return;
      }

      await PushNotifications.register();

      // Create a channel for Android (required for high-priority/heads-up notifications)
      if (Capacitor.getPlatform() === 'android') {
        PushNotifications.createChannel({
          id: 'absstem-notifs',
          name: 'Absstem Notifications',
          description: 'General notifications for ABSSTEM Activities',
          importance: 5, // High importance (heads-up)
          visibility: 1,
          sound: 'default',
          vibration: true
        });
      }
    };

    // Listeners
    const addListeners = async () => {
      const handlers = [];

      handlers.push(await PushNotifications.addListener('registration', async (token) => {
        console.log('Push registration success, token: ' + token.value);

        // Save token to Supabase
        try {
          const { error } = await supabase.functions.invoke('push-notifications', {
            body: {
              action: 'register',
              token: token.value,
              device_info: {
                platform: Capacitor.getPlatform(),
                model: navigator.userAgent // Simple device info
              }
            }
          });
          if (error) throw error;
        } catch (err) {
          console.error('Failed to register token with backend:', err);
        }
      }));

      handlers.push(await PushNotifications.addListener('registrationError', (err) => {
        console.error('Registration error: ', err.error);
      }));

      handlers.push(await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push received: ', notification);
        const event = new CustomEvent('notification-received');
        window.dispatchEvent(event);
      }));

      return handlers;
    };

    registerPush();
    const listeners = addListeners();

    return () => {
      listeners.then(l => {
        l.forEach(handler => handler.remove());
      });
    };
  }, [user]);
};
