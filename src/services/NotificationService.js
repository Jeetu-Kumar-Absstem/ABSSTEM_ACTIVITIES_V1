// src/services/NotificationService.js
import { LocalNotifications } from '@capacitor/local-notifications';

/**
 * Service to handle local notifications for the ABSSTEM Activities app.
 */
class NotificationService {
  /**
   * Initializes the notification service.
   * Checks if it's the first launch and schedules the welcome notification.
   */
  async init() {
    try {
      // 1. Check if the app has already shown the welcome notification
      const hasSeenWelcome = localStorage.getItem('absstem_welcome_notified');

      if (hasSeenWelcome === 'true') {
        console.log('NotificationService: Welcome notification already shown.');
        return;
      }

      // 2. Request permission (Required for Android 13+)
      const permissionStatus = await LocalNotifications.checkPermissions();
      console.log('NotificationService: Current permission status:', permissionStatus.display);

      if (permissionStatus.display !== 'granted') {
        const requestStatus = await LocalNotifications.requestPermissions();
        if (requestStatus.display !== 'granted') {
          console.warn('NotificationService: Notification permission denied.');
          return;
        }
      }

      // 3. Schedule the notification after 5 seconds
      await this.scheduleWelcomeNotification();

      // 4. Mark as shown in localStorage so it doesn't repeat
      localStorage.setItem('absstem_welcome_notified', 'true');
      console.log('NotificationService: Welcome notification scheduled.');
    } catch (error) {
      console.error('NotificationService: Initialization failed', error);
    }
  }

  /**
   * Schedules a local notification to be shown after 5 seconds.
   */
  async scheduleWelcomeNotification() {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: 101, // Unique ID for this notification
          title: 'Welcome to ABSSTEM Activities',
          body: 'Thank you for installing the ABSSTEM Activities app. Stay updated with tournaments, events, and exciting activities!',
          schedule: { at: new Date(Date.now() + 5000) }, // 5 seconds from now
          sound: null,
          attachments: null,
          actionTypeId: '',
          extra: null,
        },
      ],
    });
  }
}

const notificationService = new NotificationService();
export default notificationService;
