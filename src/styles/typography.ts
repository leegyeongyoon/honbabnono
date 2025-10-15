import {TextStyle} from 'react-native';
import {COLORS} from './colors';

export const TYPOGRAPHY = {
  // 제목 스타일
  heading: {
    h1: {
      fontSize: 28,
      fontWeight: 'bold' as TextStyle['fontWeight'],
      lineHeight: 36,
      color: COLORS.text.primary,
    },
    h2: {
      fontSize: 24,
      fontWeight: 'bold' as TextStyle['fontWeight'],
      lineHeight: 32,
      color: COLORS.text.primary,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600' as TextStyle['fontWeight'],
      lineHeight: 28,
      color: COLORS.text.primary,
    },
    h4: {
      fontSize: 18,
      fontWeight: '600' as TextStyle['fontWeight'],
      lineHeight: 24,
      color: COLORS.text.primary,
    },
  },
  
  // 본문 스타일
  body: {
    large: {
      fontSize: 16,
      fontWeight: '400' as TextStyle['fontWeight'],
      lineHeight: 24,
      color: COLORS.text.primary,
    },
    medium: {
      fontSize: 14,
      fontWeight: '400' as TextStyle['fontWeight'],
      lineHeight: 20,
      color: COLORS.text.secondary,
    },
    small: {
      fontSize: 12,
      fontWeight: '400' as TextStyle['fontWeight'],
      lineHeight: 16,
      color: COLORS.text.tertiary,
    },
  },
  
  // 캡션 스타일
  caption: {
    fontSize: 10,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 14,
    color: COLORS.text.tertiary,
  },
  
  // 버튼 텍스트
  button: {
    large: {
      fontSize: 16,
      fontWeight: '600' as TextStyle['fontWeight'],
      lineHeight: 20,
    },
    medium: {
      fontSize: 14,
      fontWeight: '600' as TextStyle['fontWeight'],
      lineHeight: 18,
    },
    small: {
      fontSize: 12,
      fontWeight: '500' as TextStyle['fontWeight'],
      lineHeight: 16,
    },
  },
  
  // 탭 텍스트
  tab: {
    fontSize: 12,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 16,
  },
} as const;