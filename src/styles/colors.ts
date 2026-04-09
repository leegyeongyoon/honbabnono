// 잇테이블 디자인 시스템 v14 — Figma 완성본 기반
// 키워드: 클린, 미니멀, 오렌지 CTA, Pretendard
// Figma 완성본 (2446:191) 기준 디자인 토큰

export const COLORS = {
  // 메인 컬러 — Figma CTA 오렌지
  primary: {
    main: '#FFA529',      // CTA 오렌지 (같이먹기 버튼)
    light: '#FFF8F0',     // 웜 크림 (표면/배경)
    dark: '#E8921E',      // 프레스 상태
    accent: '#FFA529',    // 활성 상태 (=main)
    gradient: '#FFB84D',  // 라이트 오렌지 (그라데이션 끝)
  },

  // 보조 컬러
  secondary: {
    main: '#6B7280',      // 쿨 그레이
    light: '#F3F5F7',     // 태그/칩 배경 (Figma)
    dark: '#4B5563',      // 딥 그레이
    warm: '#E5E7EB',      // 라이트 보더
  },

  // 중성 컬러 — Figma 기준
  neutral: {
    white: '#FFFFFF',
    grey50: '#FAFAFA',    // 카드 배경
    light: '#F5F5F5',     // 섹션 배경 / 플레이스홀더 (Figma)
    background: '#FFFFFF', // 메인 배경
    grey100: '#F5F5F5',   // 보더/디바이더 (Figma)
    grey200: '#E0E0E0',   // 디바이더
    grey300: '#BDBDBD',   // 비활성
    grey400: '#7E8082',   // 플레이스홀더 (Figma 검색바)
    grey500: '#878B94',   // 서브텍스트/캡션 (Figma)
    grey600: '#5F5F5F',   // 세컨더리 텍스트 (Figma)
    grey700: '#293038',   // 본문 텍스트 (Figma)
    grey800: '#2D2E2F',   // 카테고리 라벨 (Figma)
    grey900: '#121212',   // 프라이머리 텍스트 (Figma)
    black: '#121212',     // 타이틀 (Figma)
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

  // 텍스트 컬러 — Figma 기준
  text: {
    primary: '#121212',   // 메인 텍스트 (Figma)
    secondary: '#5F5F5F', // 보조 텍스트 (Figma)
    tertiary: '#878B94',  // 캡션/메타 (Figma)
    accent: '#FFA529',    // CTA 오렌지
    white: '#FFFFFF',
    light: '#F5F5F5',
    error: '#D32F2F',
  },

  // 특수 컬러
  special: {
    kakao: '#FEE500',
    kakaoBrown: '#191919',
    naver: '#03C75A',
    google: '#4285F4',
    new: '#D4882C',       // 브랜드 앰버
    hot: '#D32F2F',
    premium: '#7B5EA7',
    deposit: '#2E7D4F',
  },

  // 표면(surface) 컬러
  surface: {
    primary: '#FFFFFF',
    secondary: '#FAFAFA',
    elevated: '#FFFFFF',
    overlay: 'rgba(0,0,0,0.6)',
    dimmed: 'rgba(0,0,0,0.35)',
  },

  // 그라데이션
  gradient: {
    primary: ['#FFA529', '#FFB84D'],
    secondary: ['#FFA529', '#FFB84D'],
    warm: ['#FFA529', '#FFB84D'],
    sunset: ['#FAFAFA', '#F5F5F5', '#FFFFFF'],
    accent: ['#FFA529', '#FFB84D'],
    cta: ['#FFA529', '#FFB84D'],
    hero: ['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.2)', 'transparent'],
    heroCSS: '#FFA529',
    heroBg: '#FFA529',
    cardOverlay: ['transparent', 'rgba(0,0,0,0.5)'],
    ctaCSS: '#FFA529',
    subtleGold: 'linear-gradient(180deg, #FFF8F0 0%, #FFFFFF 100%)',
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
  CARD_RADIUS: 10,
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

// 그림자 스타일
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
    shadowColor: '#FFA529',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  cta: {
    shadowColor: '#FFA529',
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

// CSS 그림자
export const CSS_SHADOWS = {
  small: '0 1px 2px rgba(17,17,17,0.04), 0 1px 4px rgba(17,17,17,0.03)',
  medium: '0 2px 4px rgba(17,17,17,0.04), 0 4px 16px rgba(17,17,17,0.05)',
  large: '0 4px 8px rgba(17,17,17,0.04), 0 12px 32px rgba(17,17,17,0.06)',
  hover: '0 8px 16px rgba(17,17,17,0.05), 0 16px 40px rgba(17,17,17,0.08)',
  focused: '0 0 0 2px rgba(212,136,44,0.2)',
  cta: '0 4px 12px rgba(139,82,22,0.18), 0 8px 20px rgba(139,82,22,0.08)',
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

// 카테고리별 컬러 토큰
export const CATEGORY_COLORS = {
  korean: {
    accent: '#D4704A',    // 따뜻한 테라코타
    bg: '#FDF3EF',
    bgHover: '#F8E6DE',
  },
  chinese: {
    accent: '#C27C5A',    // 딥 앰버
    bg: '#FAF1EB',
    bgHover: '#F3E4DA',
  },
  japanese: {
    accent: '#5A9B8E',    // 세이지 그린
    bg: '#EEF6F3',
    bgHover: '#E0EDE8',
  },
  western: {
    accent: '#D4825E',    // 웜 오렌지
    bg: '#FBF2ED',
    bgHover: '#F3E5DB',
  },
  seafood: {
    accent: '#4A92A8',    // 오션 틸
    bg: '#ECF4F7',
    bgHover: '#DCF0F3',
  },
  cafe: {
    accent: '#A0866E',    // 라떼 브라운
    bg: '#F6F2EE',
    bgHover: '#EDE6DF',
  },
  bar: {
    accent: '#8E6B8A',    // 뮤트 플럼
    bg: '#F4EFF4',
    bgHover: '#EAE2EA',
  },
  bbq: {
    accent: '#C97B65',    // 차콜 엠버
    bg: '#FAF0EC',
    bgHover: '#F3E3DB',
  },
  hotpot: {
    accent: '#B8845E',    // 골든 브로스
    bg: '#F8F1EA',
    bgHover: '#F0E5DA',
  },
  buffet: {
    accent: '#7A9B6E',    // 올리브 그린
    bg: '#F0F4ED',
    bgHover: '#E4EADD',
  },
  course: {
    accent: '#7B6E9A',    // 뮤트 바이올렛
    bg: '#F2F0F6',
    bgHover: '#E6E3EF',
  },
  party: {
    accent: '#D4917A',    // 코랄 피치
    bg: '#FBF2EF',
    bgHover: '#F5E5DF',
  },
  etc: {
    accent: '#8C9196',    // 쿨 그레이
    bg: '#F3F4F5',
    bgHover: '#E8EAEB',
  },
} as const;

// 카드 스타일
export const CARD_STYLE = {
  borderWidth: 1,
  borderColor: 'rgba(17,17,17,0.06)',
  borderRadius: 10,
} as const;

// CTA 버튼 스타일 — Figma 오렌지
export const CTA_STYLE = {
  primary: {
    backgroundColor: '#FFA529',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    minHeight: 48,
  },
  primaryLarge: {
    backgroundColor: '#FFA529',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    minHeight: 52,
  },
} as const;

// 카드 변형별 스타일 토큰
export const CARD_VARIANTS = {
  grid: {
    shadow: '0 2px 8px rgba(17,17,17,0.06)',
    hoverShadow: '0 8px 24px rgba(17,17,17,0.1)',
    borderRadius: 12,
  },
  compact: {
    hoverBg: '#FAFAF8',
    borderRadius: 10,
  },
  list: {
    shadow: '0 1px 4px rgba(17,17,17,0.04)',
    borderRadius: 10,
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
    backgroundColor: '#D4882C',
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
