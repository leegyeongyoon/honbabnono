import {TextStyle} from 'react-native';
import {COLORS} from './colors';

// 타이포그래피 시스템 v4 — 프리미엄 에디토리얼
// Pretendard 폰트, 넓은 행간, 프리미엄 여백감
export const TYPOGRAPHY = {
  // 디스플레이 (히어로, 랜딩)
  display: {
    large: {
      fontSize: 34,
      fontWeight: '700' as TextStyle['fontWeight'],
      lineHeight: 44,
      letterSpacing: -0.8,
      color: COLORS.text.white,
    },
    medium: {
      fontSize: 28,
      fontWeight: '700' as TextStyle['fontWeight'],
      lineHeight: 36,
      letterSpacing: -0.6,
      color: COLORS.text.white,
    },
  },

  // 섹션 헤더
  sectionHeader: {
    title: {
      fontSize: 19,
      fontWeight: '600' as TextStyle['fontWeight'],
      lineHeight: 26,
      letterSpacing: -0.3,
      color: COLORS.text.primary,
    },
    subtitle: {
      fontSize: 13,
      fontWeight: '400' as TextStyle['fontWeight'],
      lineHeight: 18,
      letterSpacing: 0,
      color: COLORS.text.tertiary,
    },
  },

  // 제목 스타일
  heading: {
    h1: {
      fontSize: 26,
      fontWeight: '700' as TextStyle['fontWeight'],
      lineHeight: 34,
      letterSpacing: -0.5,
      color: COLORS.text.primary,
    },
    h2: {
      fontSize: 21,
      fontWeight: '600' as TextStyle['fontWeight'],
      lineHeight: 30,
      letterSpacing: -0.3,
      color: COLORS.text.primary,
    },
    h3: {
      fontSize: 18,
      fontWeight: '600' as TextStyle['fontWeight'],
      lineHeight: 26,
      letterSpacing: -0.2,
      color: COLORS.text.primary,
    },
    h4: {
      fontSize: 16,
      fontWeight: '600' as TextStyle['fontWeight'],
      lineHeight: 22,
      letterSpacing: -0.1,
      color: COLORS.text.primary,
    },
  },

  // 본문
  body: {
    large: {
      fontSize: 16,
      fontWeight: '400' as TextStyle['fontWeight'],
      lineHeight: 26,
      letterSpacing: -0.1,
      color: COLORS.text.primary,
    },
    medium: {
      fontSize: 14,
      fontWeight: '400' as TextStyle['fontWeight'],
      lineHeight: 22,
      letterSpacing: -0.05,
      color: COLORS.text.secondary,
    },
    small: {
      fontSize: 13,
      fontWeight: '400' as TextStyle['fontWeight'],
      lineHeight: 20,
      letterSpacing: 0,
      color: COLORS.text.tertiary,
    },
  },

  // 캡션
  caption: {
    fontSize: 11,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 16,
    letterSpacing: 0.2,
    color: COLORS.text.tertiary,
  },

  // 카드
  card: {
    title: {
      fontSize: 15,
      fontWeight: '600' as TextStyle['fontWeight'],
      lineHeight: 22,
      letterSpacing: -0.2,
      color: COLORS.text.primary,
    },
    subtitle: {
      fontSize: 13,
      fontWeight: '500' as TextStyle['fontWeight'],
      lineHeight: 18,
      letterSpacing: -0.05,
      color: COLORS.text.secondary,
    },
    meta: {
      fontSize: 12,
      fontWeight: '400' as TextStyle['fontWeight'],
      lineHeight: 16,
      letterSpacing: 0,
      color: COLORS.text.tertiary,
    },
    gridTitle: {
      fontSize: 14,
      fontWeight: '600' as TextStyle['fontWeight'],
      lineHeight: 20,
      letterSpacing: -0.1,
      color: COLORS.text.primary,
    },
    gridMeta: {
      fontSize: 11,
      fontWeight: '400' as TextStyle['fontWeight'],
      lineHeight: 16,
      letterSpacing: 0.05,
      color: COLORS.text.tertiary,
    },
  },

  // 위치
  location: {
    primary: {
      fontSize: 13,
      fontWeight: '500' as TextStyle['fontWeight'],
      lineHeight: 18,
      letterSpacing: -0.05,
      color: COLORS.text.primary,
    },
    secondary: {
      fontSize: 12,
      fontWeight: '400' as TextStyle['fontWeight'],
      lineHeight: 16,
      letterSpacing: 0,
      color: COLORS.text.secondary,
    },
  },

  // 버튼
  button: {
    large: {
      fontSize: 16,
      fontWeight: '600' as TextStyle['fontWeight'],
      lineHeight: 22,
      letterSpacing: -0.1,
    },
    medium: {
      fontSize: 14,
      fontWeight: '600' as TextStyle['fontWeight'],
      lineHeight: 20,
      letterSpacing: -0.05,
    },
    small: {
      fontSize: 13,
      fontWeight: '500' as TextStyle['fontWeight'],
      lineHeight: 18,
      letterSpacing: 0,
    },
  },

  // 탭
  tab: {
    fontSize: 12,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 16,
    letterSpacing: 0.1,
  },

  // 라벨
  label: {
    fontSize: 11,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 14,
    letterSpacing: 0.3,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase' as TextStyle['textTransform'],
  },

  // 입력
  input: {
    fontSize: 15,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 22,
    letterSpacing: -0.05,
    color: COLORS.text.primary,
  },

  // 플레이스홀더
  placeholder: {
    fontSize: 15,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 22,
    letterSpacing: -0.05,
    color: COLORS.neutral.grey400,
  },
} as const;

// 폰트 웨이트
export const FONT_WEIGHTS = {
  light: '300',
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
  extraBold: '800',
} as const;
