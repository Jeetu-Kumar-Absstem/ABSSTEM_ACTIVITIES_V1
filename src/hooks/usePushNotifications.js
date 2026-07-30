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
    };

    // Listeners
    const addListeners = async () => {
      await PushNotifications.addListener('registration', async (token) => {
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
      });

      await PushNotifications.addListener('registrationError', (err) => {
        console.error('Registration error: ', err.error);
      });

      await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push received: ', notification);
        // You could trigger a local toast here if you want
      });

      await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push action performed: ', notification);
        // Handle deep linking here if needed
        // For example: window.location.hash = '#/notifications';
      });
    };

    registerPush();
    addListeners();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [user]);
};
