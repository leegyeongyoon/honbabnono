import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS, SHADOWS } from '../styles/colors';
import { Icon } from './Icon';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  visible: boolean;
  onHide: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ 
  message, 
  type = 'success', 
  visible, 
  onHide, 
  duration = 3000 
}) => {
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      // 토스트 표시
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // 자동 숨김
      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          onHide();
        });
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, fadeAnim, duration, onHide]);

  if (!visible) {return null;}

  const getToastStyle = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: COLORS.functional.success,
          iconName: 'check-circle' as const,
          iconColor: COLORS.text.white,
        };
      case 'error':
        return {
          backgroundColor: COLORS.functional.error,
          iconName: 'x-circle' as const,
          iconColor: COLORS.text.white,
        };
      case 'info':
        return {
          backgroundColor: COLORS.primary.main,
          iconName: 'info' as const,
          iconColor: COLORS.text.white,
        };
      default:
        return {
          backgroundColor: COLORS.functional.success,
          iconName: 'check-circle' as const,
          iconColor: COLORS.text.white,
        };
    }
  };

  const toastStyle = getToastStyle();

  return (
    <Animated.View 
      style={[
        styles.container,
        { backgroundColor: toastStyle.backgroundColor },
        { opacity: fadeAnim }
      ]}
    >
      <Icon 
        name={toastStyle.iconName} 
        size={20} 
        color={toastStyle.iconColor} 
      />
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    zIndex: 9999,
    ...SHADOWS.medium,
  },
  message: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.white,
  },
});

export default Toast;