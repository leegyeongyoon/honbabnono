// 잇테이블 디자인 시스템 v13 — "웜 앰버"
// 벤치마크: 캐치테이블(프리미엄) + 토스(깔끔함) + 크래프트 푸드 브랜딩
// 키워드: 따뜻함, 식욕자극, 프리미엄, 크래프트, 골든
// 팔레트: 웜 앰버 + 클린 화이트 — 식사 앱에 최적화된 꿀빛 골든
// 차별화: 당근(비비드 오렌지) vs 잇테이블(깊고 따뜻한 골든 앰버)

export const COLORS = {
  // 메인 컬러 (웜 앰버 — 꿀빛 골든, 식욕자극)
  primary: {
    main: '#D4882C',      // 리치 앰버 — 메인 브랜드 컬러
    light: '#FFF8F0',     // 웜 크림 (표면/배경)
    dark: '#8B5216',      // 딥 앰버 (CTA, 강조 — 화이트 대비 6.3:1)
    accent: '#D4882C',    // 활성 상태 (=main)
    gradient: '#E9A84A',  // 라이트 골든 (그라데이션 끝)
  },

  // 보조 컬러
  secondary: {
    main: '#6B7280',      // 쿨 그레이 (Tailwind Gray-500)
    light: '#F3F4F6',     // 소프트 배경
    dark: '#4B5563',      // 딥 그레이
    warm: '#E5E7EB',      // 라이트 보더
  },

  // 중성 컬러 (웜 뉴트럴 — 브랜드 톤 통일)
  neutral: {
    white: '#FFFFFF',
    grey50: '#FAFAF8',    // 카드 배경 (웜)
    light: '#F7F5F3',     // 섹션 배경 (웜)
    background: '#FFFFFF', // 메인 배경 (순백)
    grey100: '#EFECEA',   // 보더/스켈레톤 (웜)
    grey200: '#D9D9D9',   // 디바이더
    grey300: '#BDBDBD',   // 비활성
    grey400: '#9E9E9E',   // 플레이스홀더
    grey500: '#757575',   // 서브텍스트
    grey600: '#5C4F42',   // 세컨더리 텍스트 (웜)
    grey700: '#424242',   // 강조 텍스트
    grey800: '#212121',   // 프라이머리 텍스트
    grey900: '#1A1714',   // 헤딩 (웜)
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
    primary: '#1A1714',   // 웜 다크 (높은 대비)
    secondary: '#5C4F42', // 웜 그레이
    tertiary: '#9E9E9E',  // 뮤트
    accent: '#704412',    // 웜 브라운 (날짜, 소제목 등)
    white: '#FFFFFF',
    light: '#EFECEA',
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
    overlay: 'rgba(17,17,17,0.6)',
    dimmed: 'rgba(17,17,17,0.35)',
  },

  // 그라데이션
  gradient: {
    primary: ['#8B5216', '#D4882C'],
    secondary: ['#D4882C', '#E9A84A'],
    warm: ['#8B5216', '#D4882C'],
    sunset: ['#FAFAFA', '#F5F5F5', '#FFFFFF'],
    accent: ['#8B5216', '#D4882C'],
    cta: ['#D4882C', '#E9A84A'],
    hero: ['rgba(139,82,22,0.95)', 'rgba(139,82,22,0.6)', 'transparent'],
    heroCSS: 'linear-gradient(135deg, #8B5216 0%, #A86A20 50%, #D4882C 100%)',
    heroBg: 'linear-gradient(135deg, #8B5216 0%, #A86A20 50%, #D4882C 100%)',
    cardOverlay: ['transparent', 'rgba(17,17,17,0.65)'],
    ctaCSS: 'linear-gradient(135deg, #D4882C 0%, #E9A84A 100%)',
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
    shadowColor: '#D4882C',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  cta: {
    shadowColor: '#8B5216',
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

// CTA 버튼 스타일 — 골든 앰버
export const CTA_STYLE = {
  primary: {
    backgroundColor: '#D4882C',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    minHeight: 48,
  },
  primaryLarge: {
    backgroundColor: '#D4882C',
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
