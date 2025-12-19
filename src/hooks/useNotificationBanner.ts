import { useState } from 'react';

interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}

export const useNotificationBanner = () => {
  const [notification, setNotification] = useState<NotificationData | null>(null);

  const showNotification = (
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    duration: number = 4000
  ) => {
    const id = `notification-${Date.now()}`;
    setNotification({
      id,
      title,
      message,
      type,
      duration,
    });
  };

  const showInfo = (title: string, message: string, duration?: number) => {
    showNotification(title, message, 'info', duration);
  };

  const showSuccess = (title: string, message: string, duration?: number) => {
    showNotification(title, message, 'success', duration);
  };

  const showWarning = (title: string, message: string, duration?: number) => {
    showNotification(title, message, 'warning', duration);
  };

  const showError = (title: string, message: string, duration?: number) => {
    showNotification(title, message, 'error', duration);
  };

  const hideNotification = () => {
    setNotification(null);
  };

  return {
    notification,
    showNotification,
    showInfo,
    showSuccess,
    showWarning,
    showError,
    hideNotification,
  };
};

export default useNotificationBanner;