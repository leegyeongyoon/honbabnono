import { Easing } from 'react-native';

export const ANIMATION = {
  duration: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 500,
    skeleton: 1500,
  },
  easing: {
    easeIn: Easing.bezier(0.42, 0, 1, 1),
    easeOut: Easing.bezier(0, 0, 0.58, 1),
    easeInOut: Easing.bezier(0.42, 0, 0.58, 1),
  },
  spring: {
    default: { tension: 100, friction: 8 },
    gentle: { tension: 80, friction: 10 },
    bouncy: { tension: 120, friction: 6 },
  },
  stagger: {
    listItem: 50,
  },
} as const;
