// 잇테이블 디자인 시스템 v10.1 — "토프 그레이지"
// 벤치마크: 캐치테이블(프리미엄) + 에어비앤비(따뜻함) + 토스(깔끔함)
// 키워드: 세련됨, 모던, 순백 화이트 베이스, 미니멀 프리미엄
// 팔레트: 쿨톤 토프/그레이지 + 클린 화이트 — 여백이 만드는 프리미엄

export const COLORS = {
  // 메인 컬러 (토프 그레이지 — 쿨톤이 섞인 세련된 브라운)
  primary: {
    main: '#B8A090',      // 소프트 토프 — 쿨톤 섞인 모던 브라운
    light: '#F7F4F2',     // 토프 틴트 (표면)
    dark: '#8C7565',      // 딥 토프 (CTA, 강조 — 화이트 대비 4.6:1)
    accent: '#B8A090',    // 활성 상태 (=main)
    gradient: '#C8B8AC',  // 라이트 토프 (그라데이션 끝)
  },

  // 보조 컬러
  secondary: {
    main: '#888888',      // 뉴트럴 그레이
    light: '#F5F5F5',     // 소프트 배경
    dark: '#666666',      // 딥 그레이
    warm: '#EBEBEB',      // 라이트 보더
  },

  // 중성 컬러 (클린 뉴트럴 — 웜 틴트 제거)
  neutral: {
    white: '#FFFFFF',
    grey50: '#FAFAFA',    // 카드 배경
    light: '#F5F5F5',     // 섹션 배경
    background: '#FFFFFF', // 메인 배경 (순백)
    grey100: '#E8E8E8',   // 보더
    grey200: '#D9D9D9',   // 디바이더
    grey300: '#BDBDBD',   // 비활성
    grey400: '#9E9E9E',   // 플레이스홀더
    grey500: '#757575',   // 서브텍스트
    grey600: '#616161',   // 세컨더리 텍스트
    grey700: '#424242',   // 강조 텍스트
    grey800: '#212121',   // 프라이머리 텍스트
    grey900: '#171717',   // 헤딩
    black: '#111111',     // 퓨어 다크
  },

  // 기능적 컬러
  functional: {
    success: '#2E7D4F',
    successLight: '#EDF7F0',
    warning: '#E69100',
    warningLight: '#FFF8E6',
    error: '#D32F2F',
    errorLight: '#FDECEA',
    info: '#1976D2',
    infoLight: '#E8F0FE',
  },

  // 텍스트 컬러
  text: {
    primary: '#171717',   // 다크 (높은 대비)
    secondary: '#616161', // 그레이
    tertiary: '#9E9E9E',  // 뮤트
    white: '#FFFFFF',
    light: '#E8E8E8',
    error: '#D32F2F',
  },

  // 특수 컬러
  special: {
    kakao: '#FEE500',
    kakaoBrown: '#191919',
    naver: '#03C75A',
    google: '#4285F4',
    new: '#B8A090',       // 브랜드 토프 (일관성)
    hot: '#D32F2F',
    premium: '#7B5EA7',
    deposit: '#2E7D4F',
  },

  // 표면(surface) 컬러
  surface: {
    primary: '#FFFFFF',
    secondary: '#FAFAFA',
    elevated: '#FFFFFF',
    overlay: 'rgba(17,17,17,0.6)',
    dimmed: 'rgba(17,17,17,0.35)',
  },

  // 그라데이션
  gradient: {
    primary: ['#8C7565', '#B8A090'],
    secondary: ['#B8A090', '#C8B8AC'],
    warm: ['#8C7565', '#B8A090'],
    sunset: ['#FAFAFA', '#F5F5F5', '#FFFFFF'],
    accent: ['#8C7565', '#B8A090'],
    cta: ['#B8A090', '#C8B8AC'],
    hero: ['rgba(140,117,101,0.95)', 'rgba(140,117,101,0.6)', 'transparent'],
    heroCSS: 'linear-gradient(135deg, #8C7565 0%, #A28B7B 50%, #B8A090 100%)',
    heroBg: 'linear-gradient(135deg, #8C7565 0%, #A28B7B 50%, #B8A090 100%)',
    cardOverlay: ['transparent', 'rgba(17,17,17,0.65)'],
    ctaCSS: 'linear-gradient(135deg, #B8A090 0%, #C8B8AC 100%)',
    subtleGold: 'linear-gradient(180deg, #F7F4F2 0%, #FFFFFF 100%)',
  },
} as const;

// 투명도 헬퍼
export const withOpacity = (color: string, opacity: number) => {
  return `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
};

// 레이아웃 상수
export const LAYOUT = {
  HEADER_HEIGHT: 56,
  HEADER_PADDING_VERTICAL: 10,
  HEADER_PADDING_HORIZONTAL: 20,
  CONTENT_TOP_MARGIN: 16,
  BOTTOM_NAV_HEIGHT: 60,
  CONTENT_PADDING_HORIZONTAL: 20,
  CONTENT_PADDING_VERTICAL: 16,
  CARD_RADIUS: 10,       // 8 → 10 (모던 라운딩)
  TAB_HEIGHT: 48,
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
  fast: '120ms ease-out',
  normal: '200ms ease-out',
  slow: '320ms ease-out',
  spring: '400ms cubic-bezier(0.22, 1, 0.36, 1)',
} as const;

// 반응형 Breakpoints
export const BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  wide: 1280,
} as const;

// 그림자 스타일 (뉴트럴, 플랫+모던)
export const SHADOWS = {
  small: {
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  large: {
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  hover: {
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 32,
    elevation: 12,
  },
  focused: {
    shadowColor: '#B8A090',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  cta: {
    shadowColor: '#8C7565',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  fab: {
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  sticky: {
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
};

// CSS 그림자 (플랫+모던)
export const CSS_SHADOWS = {
  small: '0 1px 2px rgba(17,17,17,0.04), 0 1px 4px rgba(17,17,17,0.03)',
  medium: '0 2px 4px rgba(17,17,17,0.04), 0 4px 16px rgba(17,17,17,0.05)',
  large: '0 4px 8px rgba(17,17,17,0.04), 0 12px 32px rgba(17,17,17,0.06)',
  hover: '0 8px 16px rgba(17,17,17,0.05), 0 16px 40px rgba(17,17,17,0.08)',
  focused: '0 0 0 2px rgba(184,160,144,0.2)',
  cta: '0 4px 12px rgba(140,117,101,0.18), 0 8px 20px rgba(140,117,101,0.08)',
  fab: '0 4px 12px rgba(17,17,17,0.08), 0 8px 24px rgba(17,17,17,0.06)',
  sticky: '0 1px 0 rgba(17,17,17,0.03), 0 1px 6px rgba(17,17,17,0.02)',
  card: '0 1px 2px rgba(17,17,17,0.03), 0 2px 12px rgba(17,17,17,0.04)',
  cardHover: '0 4px 8px rgba(17,17,17,0.05), 0 8px 28px rgba(17,17,17,0.06)',
  stickyHeader: '0 1px 0 rgba(17,17,17,0.04)',
  bottomSheet: '0 -2px 8px rgba(17,17,17,0.03), 0 -4px 20px rgba(17,17,17,0.05)',
  inset: 'inset 0 1px 2px rgba(17,17,17,0.03)',
} as const;

// 애니메이션 토큰
export const ANIMATION_TOKENS = {
  duration: {
    instant: 80,
    fast: 120,
    normal: 200,
    slow: 320,
    slower: 480,
    slowest: 700,
  },
  easing: {
    default: 'cubic-bezier(0.22, 1, 0.36, 1)',
    easeIn: 'cubic-bezier(0.55, 0, 1, 0.45)',
    easeOut: 'cubic-bezier(0, 0.55, 0.45, 1)',
    spring: 'cubic-bezier(0.22, 1, 0.36, 1)',
    bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
} as const;

// 카드 스타일
export const CARD_STYLE = {
  borderWidth: 1,
  borderColor: 'rgba(17,17,17,0.06)',
  borderRadius: 10,
} as const;

// CTA 버튼 스타일 — 딥 토프
export const CTA_STYLE = {
  primary: {
    backgroundColor: '#8C7565',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    minHeight: 48,
  },
  primaryLarge: {
    backgroundColor: '#8C7565',
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 32,
    minHeight: 52,
  },
} as const;

// 뱃지 스타일
export const BADGE_STYLES = {
  recruiting: {
    backgroundColor: '#2E7D4F',
    color: '#FFFFFF',
  },
  hot: {
    backgroundColor: '#D32F2F',
    color: '#FFFFFF',
  },
  new: {
    backgroundColor: '#B8A090',
    color: '#FFFFFF',
  },
  deposit: {
    backgroundColor: '#2E7D4F',
    color: '#FFFFFF',
  },
  premium: {
    backgroundColor: '#7B5EA7',
    color: '#FFFFFF',
  },
} as const;
