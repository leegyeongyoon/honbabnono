import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle, StyleProp } from 'react-native';
import { ANIMATION } from '../../utils/animations';

interface FadeInProps {
  duration?: number;
  delay?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const FadeIn: React.FC<FadeInProps> = ({
  duration = ANIMATION.duration.normal,
  delay = 0,
  children,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration,
      delay,
      easing: ANIMATION.easing.easeOut,
      useNativeDriver: true,
    }).start();
  }, [opacity, duration, delay]);

  return (
    <Animated.View style={[{ opacity }, style]}>
      {children}
    </Animated.View>
  );
};

export default FadeIn;
