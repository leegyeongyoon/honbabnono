import {TextStyle} from 'react-native';
import {COLORS} from './colors';

// Pretendard 폰트에 최적화된 타이포그래피 시스템
export const TYPOGRAPHY = {
  // 제목 스타일 (헤더, 큰 제목)
  heading: {
    h1: {
      fontSize: 24,
      fontWeight: '700' as TextStyle['fontWeight'],
      lineHeight: 32,
      letterSpacing: -0.3,
      color: COLORS.text.primary,
    },
    h2: {
      fontSize: 20,
      fontWeight: '700' as TextStyle['fontWeight'],
      lineHeight: 28,
      letterSpacing: -0.2,
      color: COLORS.text.primary,
    },
    h3: {
      fontSize: 18,
      fontWeight: '600' as TextStyle['fontWeight'],
      lineHeight: 24,
      letterSpacing: -0.1,
      color: COLORS.text.primary,
    },
    h4: {
      fontSize: 16,
      fontWeight: '600' as TextStyle['fontWeight'],
      lineHeight: 22,
      letterSpacing: -0.05,
      color: COLORS.text.primary,
    },
  },
  
  // 본문 텍스트
  body: {
    large: {
      fontSize: 16,
      fontWeight: '400' as TextStyle['fontWeight'],
      lineHeight: 24,
      letterSpacing: 0,
      color: COLORS.text.primary,
    },
    medium: {
      fontSize: 14,
      fontWeight: '400' as TextStyle['fontWeight'],
      lineHeight: 20,
      letterSpacing: 0,
      color: COLORS.text.secondary,
    },
    small: {
      fontSize: 12,
      fontWeight: '400' as TextStyle['fontWeight'],
      lineHeight: 18,
      letterSpacing: 0,
      color: COLORS.text.tertiary,
    },
  },
  
  // 특별한 용도별 스타일
  card: {
    title: {
      fontSize: 15,
      fontWeight: '600' as TextStyle['fontWeight'],
      lineHeight: 20,
      letterSpacing: -0.03,
      color: COLORS.text.primary,
    },
    subtitle: {
      fontSize: 13,
      fontWeight: '500' as TextStyle['fontWeight'],
      lineHeight: 18,
      letterSpacing: 0,
      color: COLORS.text.secondary,
    },
    meta: {
      fontSize: 11,
      fontWeight: '400' as TextStyle['fontWeight'],
      lineHeight: 16,
      letterSpacing: 0.05,
      color: COLORS.text.tertiary,
    },
  },
  
  // 위치 관련 텍스트
  location: {
    primary: {
      fontSize: 14,
      fontWeight: '600' as TextStyle['fontWeight'],
      lineHeight: 18,
      letterSpacing: -0.05,
      color: COLORS.text.primary,
    },
    secondary: {
      fontSize: 11,
      fontWeight: '400' as TextStyle['fontWeight'],
      lineHeight: 14,
      letterSpacing: 0,
      color: COLORS.text.secondary,
    },
  },
  
  // 버튼 텍스트
  button: {
    large: {
      fontSize: 16,
      fontWeight: '600' as TextStyle['fontWeight'],
      lineHeight: 20,
      letterSpacing: -0.05,
    },
    medium: {
      fontSize: 14,
      fontWeight: '600' as TextStyle['fontWeight'],
      lineHeight: 18,
      letterSpacing: -0.03,
    },
    small: {
      fontSize: 12,
      fontWeight: '500' as TextStyle['fontWeight'],
      lineHeight: 16,
      letterSpacing: 0,
    },
  },
  
  // 탭 텍스트
  tab: {
    fontSize: 13,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 18,
    letterSpacing: 0,
  },
  
  // 캐주얼한 텍스트 (뱃지, 라벨 등)
  label: {
    fontSize: 10,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 14,
    letterSpacing: 0.1,
    color: COLORS.text.tertiary,
  },
  
  // 입력 필드
  input: {
    fontSize: 15,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 20,
    letterSpacing: 0,
    color: COLORS.text.primary,
  },
  
  // 플레이스홀더
  placeholder: {
    fontSize: 15,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 20,
    letterSpacing: 0,
    color: COLORS.text.tertiary,
  },
} as const;

// 폰트 웨이트 상수
export const FONT_WEIGHTS = {
  light: '300',
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
  extraBold: '800',
} as const;