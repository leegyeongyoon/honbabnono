import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle, StyleProp } from 'react-native';
import { ANIMATION } from '../../utils/animations';

interface SlideUpProps {
  duration?: number;
  delay?: number;
  distance?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const SlideUp: React.FC<SlideUpProps> = ({
  duration = ANIMATION.duration.normal,
  delay = 0,
  distance = 30,
  children,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(distance)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        easing: ANIMATION.easing.easeOut,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        easing: ANIMATION.easing.easeOut,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY, duration, delay, distance]);

  return (
    <Animated.View
      style={[
        { opacity, transform: [{ translateY }] },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

export default SlideUp;
