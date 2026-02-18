import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  PanResponder,
  Platform,
} from 'react-native';
import { COLORS, SHADOWS, LAYOUT } from '../styles/colors';
import { Icon } from './Icon';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  visible: boolean;
  onHide: () => void;
  duration?: number;
  action?: { label: string; onPress: () => void };
}

const Toast: React.FC<ToastProps> = ({
  message,
  type = 'success',
  visible,
  onHide,
  duration = 3000,
  action,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(50)).current;
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 10,
      onPanResponderMove: (_, gestureState) => {
        translateX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > 100) {
          const direction = gestureState.dx > 0 ? 300 : -300;
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: direction,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            onHide();
            translateX.setValue(0);
          });
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      translateX.setValue(0);
      translateY.setValue(50);
      fadeAnim.setValue(0);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 50,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onHide();
        });
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, fadeAnim, translateY, duration, onHide]);

  if (!visible) {
    return null;
  }

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
      case 'warning':
        return {
          backgroundColor: COLORS.functional.warning,
          iconName: 'alert-triangle' as const,
          iconColor: COLORS.text.white,
        };
      case 'info':
        return {
          backgroundColor: COLORS.functional.info,
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
        {
          opacity: fadeAnim,
          transform: [{ translateY }, { translateX }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <Icon
        name={toastStyle.iconName}
        size={20}
        color={toastStyle.iconColor}
      />
      <Text style={styles.message}>{message}</Text>
      {action && (
        <TouchableOpacity onPress={action.onPress} activeOpacity={0.7}>
          <Text style={styles.actionLabel}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: LAYOUT.BOTTOM_NAV_HEIGHT + 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    zIndex: 9999,
    ...SHADOWS.medium,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(17,17,17,0.08), 0 8px 24px rgba(17,17,17,0.06)',
    } as any : {}),
  },
  message: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text.white,
  },
  actionLabel: {
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text.white,
    textDecorationLine: 'underline',
  },
});

export default Toast;
