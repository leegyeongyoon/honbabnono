// "따뜻한 신뢰" 브랜드 컬러 팔레트 — 밥+신뢰, 따뜻하지만 가볍지 않은
export const COLORS = {
  // 메인 컬러 (깊은 황금갈색 — 쌀/밥의 따뜻함+신뢰)
  primary: {
    main: '#8B6914',      // 깊은 황금갈색 (메인 액센트)
    light: '#FFF8E7',     // 크림골드 (배경 하이라이트)
    dark: '#6B4F0E',      // 에스프레소 (강조/호버)
    accent: '#FFFCF5',    // 아이보리 (표면)
  },

  // 보조 컬러
  secondary: {
    main: '#D4A54A',      // 골든앰버 (포인트)
    light: '#FFFCF5',     // 아이보리 배경
    dark: '#B8912E',      // 다크 골든
    warm: '#FFF8E7',      // 따뜻한 표면
  },

  // 중성 컬러 (미세한 웜화이트 기반)
  neutral: {
    white: '#FFFFFF',     // 깨끗한 화이트 카드
    light: '#FAFAF8',     // 미세한 웜화이트
    background: '#FAFAF8', // 미세한 웜화이트 (메인 배경)
    grey100: '#F0EBE3',   // 부드러운 베이지 보더
    grey200: '#D9D1C7',   // 미디엄 베이지
    grey300: '#C4B8A8',   // 소피스티케이트 베이지
    grey400: '#A89888',   // 연한 브라운
    grey500: '#7A6B5D',   // 중간 브라운
    grey600: '#4C422C',   // 다크 브라운
    grey700: '#3D3523',   // 매우 진한 브라운
    grey800: '#2E281A',   // 최다크 브라운
    grey900: '#1F1B11',   // 거의 블랙
    black: '#1A1610',     // 딥 블랙
  },

  // 기능적 컬러
  functional: {
    success: '#5B9A6F',   // 자연스러운 그린
    warning: '#E5A84B',   // 따뜻한 앰버
    error: '#D4544E',     // 차분한 레드
    info: '#6B8EAE',      // 차분한 블루
  },

  // 텍스트 컬러
  text: {
    primary: '#1E1810',   // 딥브라운블랙 (가독성 강화)
    secondary: '#7A6B5D', // 중간 브라운
    tertiary: '#8A7B6B',  // 연한 브라운 (WCAG AA ~4.5:1 on white)
    white: '#FFFFFF',     // 순수한 화이트
    light: '#F0EBE3',     // 따뜻한 베이지
    error: '#D4544E',     // 에러 텍스트용
  },

  // 특수 컬러
  special: {
    kakao: '#FEE500',    // 카카오 로그인
  },

  // 그라데이션
  gradient: {
    primary: ['#8B6914', '#FFF8E7'],           // 골드-크림 그라데이션
    secondary: ['#D4A54A', '#FFF8E7'],         // 앰버-크림 그라데이션
    warm: ['#8B6914', '#D4A54A'],              // 골드-앰버 그라데이션
    sunset: ['#FAFAF8', '#FFF8E7', '#8B6914', '#6B4F0E'], // 4단계 그라데이션
    accent: ['#1E1810', '#8B6914'],            // 강조용 다크-골드 그라데이션
  },
} as const;

// 투명도 헬퍼
export const withOpacity = (color: string, opacity: number) => {
  return `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
};

// 레이아웃 상수
export const LAYOUT = {
  HEADER_HEIGHT: 72,
  HEADER_PADDING_VERTICAL: 12,
  HEADER_PADDING_HORIZONTAL: 20,
  CONTENT_TOP_MARGIN: 20,
  BOTTOM_NAV_HEIGHT: 64,
  CONTENT_PADDING_HORIZONTAL: 20,
  CONTENT_PADDING_VERTICAL: 16,
  CARD_RADIUS: 16,
  TAB_HEIGHT: 56,
} as const;

// Z-Index 레이어 시스템
export const Z_INDEX = {
  base: 0,
  card: 1,
  sticky: 10,
  dropdown: 100,
  overlay: 500,
  modal: 1000,
  toast: 9999,
} as const;

// 트랜지션 토큰
export const TRANSITIONS = {
  fast: '150ms ease',
  normal: '200ms ease',
  slow: '300ms ease',
  spring: '300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

// 반응형 Breakpoints
export const BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  wide: 1280,
} as const;

// 그림자 스타일 (중립 블랙 — 깨끗한 그림자)
const SHADOW_COLOR = '#000000';

export const SHADOWS = {
  small: {
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  medium: {
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  large: {
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  hover: {
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 12,
  },
  focused: {
    shadowColor: '#8B6914',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
};

// CSS 그림자 (웹 전용 — 듀얼 레이어)
export const CSS_SHADOWS = {
  small: '0 1px 3px rgba(0,0,0,0.06), 0 4px 8px rgba(0,0,0,0.06)',
  medium: '0 2px 6px rgba(0,0,0,0.06), 0 8px 20px rgba(0,0,0,0.08)',
  large: '0 4px 8px rgba(0,0,0,0.04), 0 16px 32px rgba(0,0,0,0.08)',
  hover: '0 4px 12px rgba(0,0,0,0.08), 0 12px 28px rgba(0,0,0,0.12)',
  focused: '0 0 0 3px rgba(139, 105, 20, 0.3)',
} as const;

// 카드 스타일 상수 (shadow + subtle border 결합)
export const CARD_STYLE = {
  borderWidth: 1,
  borderColor: 'rgba(0,0,0,0.04)',
  borderRadius: 16,
} as const;
