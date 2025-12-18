import { useState, useCallback } from 'react';

interface PopupButton {
  text: string;
  style?: 'primary' | 'secondary' | 'danger';
  onPress: () => void;
}

interface PopupConfig {
  title?: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  buttons?: PopupButton[];
  showCloseButton?: boolean;
  backdrop?: boolean;
  animation?: 'fade' | 'slide' | 'scale';
}

interface PopupState extends PopupConfig {
  visible: boolean;
}

export const usePopup = () => {
  const [popupState, setPopupState] = useState<PopupState>({
    visible: false,
    message: '',
    type: 'info',
  });

  const showPopup = useCallback((config: PopupConfig) => {
    setPopupState({
      ...config,
      visible: true,
    });
  }, []);

  const hidePopup = useCallback(() => {
    setPopupState(prev => ({
      ...prev,
      visible: false,
    }));
  }, []);

  // 편의 메서드들
  const showSuccess = useCallback((message: string, title?: string) => {
    showPopup({
      title,
      message,
      type: 'success',
      animation: 'scale',
    });
  }, [showPopup]);

  const showError = useCallback((message: string, title?: string) => {
    showPopup({
      title,
      message,
      type: 'error',
      animation: 'scale',
    });
  }, [showPopup]);

  const showWarning = useCallback((message: string, title?: string) => {
    showPopup({
      title,
      message,
      type: 'warning',
      animation: 'scale',
    });
  }, [showPopup]);

  const showInfo = useCallback((message: string, title?: string) => {
    showPopup({
      title,
      message,
      type: 'info',
      animation: 'scale',
    });
  }, [showPopup]);

  const showConfirm = useCallback((
    message: string, 
    onConfirm: () => void,
    onCancel?: () => void,
    title?: string
  ) => {
    showPopup({
      title,
      message,
      type: 'warning',
      animation: 'scale',
      buttons: [
        {
          text: '취소',
          style: 'secondary',
          onPress: onCancel || hidePopup,
        },
        {
          text: '확인',
          style: 'danger',
          onPress: () => {
            onConfirm();
            hidePopup();
          },
        },
      ],
    });
  }, [showPopup, hidePopup]);

  const showAlert = useCallback((message: string, title?: string) => {
    showPopup({
      title,
      message,
      type: 'info',
      animation: 'scale',
      buttons: [
        {
          text: '확인',
          style: 'primary',
          onPress: hidePopup,
        },
      ],
    });
  }, [showPopup, hidePopup]);

  return {
    popupState,
    showPopup,
    hidePopup,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirm,
    showAlert,
  };
};

export default usePopup;