import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle, StyleProp } from 'react-native';
import { ANIMATION } from '../../utils/animations';

interface ScaleInProps {
  duration?: number;
  delay?: number;
  initialScale?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const ScaleIn: React.FC<ScaleInProps> = ({
  duration = ANIMATION.duration.normal,
  delay = 0,
  initialScale = 0.9,
  children,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(initialScale)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        easing: ANIMATION.easing.easeOut,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration,
        delay,
        easing: ANIMATION.easing.easeOut,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, scale, duration, delay, initialScale]);

  return (
    <Animated.View
      style={[
        { opacity, transform: [{ scale }] },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

export default ScaleIn;
