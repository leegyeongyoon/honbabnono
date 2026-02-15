import { useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  visible: boolean;
  message: string;
  type: ToastType;
  action?: { label: string; onPress: () => void };
}

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
  action?: { label: string; onPress: () => void };
}

export const useToast = () => {
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: '',
    type: 'success',
  });

  const [queue, setQueue] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ visible: true, message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
    // Show next in queue
    setQueue((prev) => {
      if (prev.length > 0) {
        const [next, ...rest] = prev;
        setTimeout(() => {
          setToast({ visible: true, message: next.message, type: next.type, action: next.action });
        }, 300);
        return rest;
      }
      return prev;
    });
  }, []);

  const showSuccess = useCallback((message: string) => showToast(message, 'success'), [showToast]);
  const showError = useCallback((message: string) => showToast(message, 'error'), [showToast]);
  const showWarning = useCallback((message: string) => showToast(message, 'warning'), [showToast]);
  const showInfo = useCallback((message: string) => showToast(message, 'info'), [showToast]);

  const showWithAction = useCallback(
    (message: string, type: ToastType, action: { label: string; onPress: () => void }) => {
      setToast({ visible: true, message, type, action });
    },
    []
  );

  return {
    toast,
    showToast,
    hideToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showWithAction,
  };
};
