import { Easing, Animated, Platform } from 'react-native';

export const ANIMATION = {
  duration: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 500,
    skeleton: 1500,
    pageTransition: 350,
    celebration: 800,
  },
  easing: {
    easeIn: Easing.bezier(0.42, 0, 1, 1),
    easeOut: Easing.bezier(0, 0, 0.58, 1),
    easeInOut: Easing.bezier(0.42, 0, 0.58, 1),
    spring: Easing.bezier(0.34, 1.56, 0.64, 1),
    decelerate: Easing.bezier(0, 0, 0.2, 1),
  },
  spring: {
    default: { tension: 100, friction: 8 },
    gentle: { tension: 80, friction: 10 },
    bouncy: { tension: 120, friction: 6 },
    button: { tension: 150, friction: 8 },
    card: { tension: 100, friction: 10 },
    snappy: { tension: 200, friction: 12 },
  },
  stagger: {
    listItem: 50,
    card: 80,
    section: 120,
  },
  // Web CSS transition strings
  web: {
    cardHover: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease',
    buttonPress: 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
    fadeIn: 'opacity 0.3s ease-out',
    slideUp: 'transform 0.35s cubic-bezier(0, 0, 0.2, 1), opacity 0.35s ease-out',
  },
} as const;

/**
 * Creates a press animation for buttons/cards.
 * Returns { scaleValue, pressHandlers } to spread on Animated.View + TouchableOpacity.
 */
export const createPressAnimation = (
  scaleValue: Animated.Value,
  options: { toValue?: number; useSpring?: boolean } = {}
) => {
  const { toValue = 0.96, useSpring = true } = options;

  const onPressIn = () => {
    if (useSpring) {
      Animated.spring(scaleValue, {
        toValue,
        ...ANIMATION.spring.button,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(scaleValue, {
        toValue,
        duration: ANIMATION.duration.instant,
        easing: ANIMATION.easing.easeOut,
        useNativeDriver: true,
      }).start();
    }
  };

  const onPressOut = () => {
    if (useSpring) {
      Animated.spring(scaleValue, {
        toValue: 1,
        ...ANIMATION.spring.button,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: ANIMATION.duration.fast,
        easing: ANIMATION.easing.spring,
        useNativeDriver: true,
      }).start();
    }
  };

  return { onPressIn, onPressOut };
};

/**
 * Fade-in animation for screen/section entry.
 */
export const createFadeInAnimation = (
  opacityValue: Animated.Value,
  translateYValue?: Animated.Value,
  options: { delay?: number; duration?: number } = {}
) => {
  const { delay = 0, duration = ANIMATION.duration.normal } = options;
  const animations: Animated.CompositeAnimation[] = [
    Animated.timing(opacityValue, {
      toValue: 1,
      duration,
      delay,
      easing: ANIMATION.easing.easeOut,
      useNativeDriver: true,
    }),
  ];

  if (translateYValue) {
    animations.push(
      Animated.timing(translateYValue, {
        toValue: 0,
        duration,
        delay,
        easing: ANIMATION.easing.decelerate,
        useNativeDriver: true,
      })
    );
  }

  return Animated.parallel(animations);
};

/**
 * Staggered list entrance animation.
 */
export const createStaggerAnimation = (
  items: { opacity: Animated.Value; translateY: Animated.Value }[],
  options: { staggerDelay?: number; itemDuration?: number } = {}
) => {
  const { staggerDelay = ANIMATION.stagger.listItem, itemDuration = ANIMATION.duration.normal } = options;

  return Animated.stagger(
    staggerDelay,
    items.map((item) =>
      Animated.parallel([
        Animated.timing(item.opacity, {
          toValue: 1,
          duration: itemDuration,
          easing: ANIMATION.easing.easeOut,
          useNativeDriver: true,
        }),
        Animated.timing(item.translateY, {
          toValue: 0,
          duration: itemDuration,
          easing: ANIMATION.easing.decelerate,
          useNativeDriver: true,
        }),
      ])
    )
  );
};

/**
 * Skeleton pulse animation (looped).
 */
export const createSkeletonPulse = (opacityValue: Animated.Value) => {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(opacityValue, {
        toValue: 0.4,
        duration: ANIMATION.duration.skeleton / 2,
        easing: ANIMATION.easing.easeInOut,
        useNativeDriver: true,
      }),
      Animated.timing(opacityValue, {
        toValue: 1,
        duration: ANIMATION.duration.skeleton / 2,
        easing: ANIMATION.easing.easeInOut,
        useNativeDriver: true,
      }),
    ])
  );
};
