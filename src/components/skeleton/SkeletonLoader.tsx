import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, Platform, ViewStyle, StyleProp, Easing } from 'react-native';
import { COLORS } from '../../styles/colors';
import { BORDER_RADIUS } from '../../styles/spacing';
import { ANIMATION } from '../../utils/animations';

type SkeletonVariant = 'text' | 'circle' | 'rectangle';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  variant?: SkeletonVariant;
  style?: StyleProp<ViewStyle>;
  animated?: boolean;
}

// shimmer @keyframes is now defined globally in dist/index.html
// No need to inject inline styles

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 16,
  borderRadius,
  variant = 'rectangle',
  style,
  animated = true,
}) => {
  const opacity = useRef(new Animated.Value(1)).current;

  let resolvedHeight = height;
  let resolvedBorderRadius = borderRadius;
  let resolvedWidth: number | string = width;

  if (variant === 'circle') {
    resolvedBorderRadius = resolvedBorderRadius ?? BORDER_RADIUS.full;
    resolvedWidth = resolvedHeight;
  } else if (variant === 'text') {
    resolvedHeight = height === 16 ? 14 : height;
    resolvedBorderRadius = resolvedBorderRadius ?? BORDER_RADIUS.xs;
  } else {
    resolvedBorderRadius = resolvedBorderRadius ?? BORDER_RADIUS.sm;
  }

  useEffect(() => {
    if (!animated || Platform.OS === 'web') return;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 700,
          easing: Easing.bezier(0.42, 0, 0.58, 1),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 700,
          easing: Easing.bezier(0.42, 0, 0.58, 1),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [opacity, animated]);

  if (Platform.OS === 'web') {

    const webStyle: Record<string, unknown> = {
      width: resolvedWidth,
      height: resolvedHeight,
      borderRadius: resolvedBorderRadius,
      backgroundImage: `linear-gradient(90deg, ${COLORS.neutral.grey100} 25%, ${COLORS.neutral.grey200} 50%, ${COLORS.neutral.grey100} 75%)`,
      backgroundSize: '200% 100%',
      animationName: animated ? 'shimmer' : 'none',
      animationDuration: '1.5s',
      animationIterationCount: 'infinite',
      animationTimingFunction: 'linear',
    };

    return (
      <View
        style={[webStyle as ViewStyle, style]}
      />
    );
  }

  return (
    <Animated.View
      style={[
        styles.base,
        {
          width: resolvedWidth,
          height: resolvedHeight,
          borderRadius: resolvedBorderRadius,
          opacity: animated ? opacity : 1,
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: COLORS.neutral.grey100,
  },
});

export default SkeletonLoader;
