// 잇테이블 소피스티케이트 베이지 컬러 팔레트 (Figma 와이어프레임 기반)
export const COLORS = {
  // 메인 컬러 (소피스티케이트 베이지 톤)
  primary: {
    main: '#C9B59C',      // 소피스티케이트 베이지 (브랜드 컬러)
    light: '#F9F8F6',     // 크림 배경
    dark: '#D9CFC7',      // 미디엄 베이지
    accent: '#EFE9E3',    // 따뜻한 오프화이트 (보더, 카드 배경)
  },

  // 보조 컬러 (베이지 톤 변형)
  secondary: {
    main: '#D9CFC7',      // 미디엄 베이지
    light: '#F9F8F6',     // 크림 배경
    dark: '#C9B59C',      // 소피스티케이트 베이지
    warm: '#EFE9E3',      // 따뜻한 오프화이트
  },

  // 중성 컬러 (베이지 톤 기반)
  neutral: {
    white: '#FFFFFF',     // 순수한 화이트
    light: '#F9F8F6',     // 크림 배경
    background: '#F9F8F6', // 크림 배경
    grey100: '#EFE9E3',   // 따뜻한 오프화이트
    grey200: '#D9CFC7',   // 미디엄 베이지
    grey300: '#C9B59C',   // 소피스티케이트 베이지
    grey400: '#A08B7A',   // 라이트 브라운
    grey500: '#766653',   // 브라운
    grey600: '#4C422C',   // 다크 브라운
    grey700: '#3D3523',   // 매우 진한 브라운
    grey800: '#2E281A',   // 최다크 브라운
    grey900: '#1F1B11',   // 거의 블랙
    black: '#1A1610',     // 딥 블랙
  },

  // 기능적 컬러 (Figma 스펙 기반)
  functional: {
    success: '#7A8A6E',   // 자연스러운 그린
    warning: '#C9B59C',   // 베이지 (경고)
    error: '#B5857A',     // 뮤트 레드
    info: '#8B9AAB',      // 차분한 블루
  },

  // 텍스트 컬러 (Figma 스펙 기반)
  text: {
    primary: '#4C422C',   // 다크 브라운 (메인 텍스트)
    secondary: '#766653', // 브라운 (보조 텍스트)
    tertiary: '#A08B7A',  // 라이트 브라운 (부가 텍스트)
    white: '#FFFFFF',     // 순수한 화이트
    light: '#EFE9E3',     // 따뜻한 오프화이트
    error: '#B5857A',     // 에러 텍스트용
  },

  // 특수 컬러
  special: {
    kakao: '#FEE500',    // 카카오 로그인
  },

  // 그라데이션 (베이지 톤)
  gradient: {
    primary: ['#C9B59C', '#F9F8F6'],           // 베이지-크림 그라데이션
    secondary: ['#D9CFC7', '#EFE9E3'],         // 미디엄베이지-오프화이트 그라데이션
    warm: ['#C9B59C', '#D9CFC7'],              // 베이지-미디엄베이지 그라데이션
    sunset: ['#F9F8F6', '#EFE9E3', '#D9CFC7', '#C9B59C'], // 4단계 그라데이션
    accent: ['#4C422C', '#C9B59C'],            // 강조용 다크-베이지 그라데이션
  },
} as const;

// 투명도 헬퍼
export const withOpacity = (color: string, opacity: number) => {
  return `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
};

// 레이아웃 상수 (Figma 스펙 기반)
export const LAYOUT = {
  HEADER_HEIGHT: 72, // 고정 헤더 높이 (모든 화면 동일)
  HEADER_PADDING_VERTICAL: 12, // 헤더 상하 패딩
  HEADER_PADDING_HORIZONTAL: 20, // 헤더 좌우 패딩
  CONTENT_TOP_MARGIN: 20, // 컨텐츠 상단 마진
  BOTTOM_NAV_HEIGHT: 60, // 하단 내비게이션 높이
  CONTENT_PADDING_HORIZONTAL: 20, // 컨텐츠 좌우 패딩
  CONTENT_PADDING_VERTICAL: 16, // 컨텐츠 상하 패딩
  CARD_RADIUS: 16, // 카드 둥근 모서리
  TAB_HEIGHT: 56, // 탭 높이
} as const;

// 그림자 스타일 (Figma 스펙: rgba(181, 160, 141, opacity))
const SHADOW_COLOR = '#B5A08D';

export const SHADOWS = {
  small: {
    shadowColor: SHADOW_COLOR,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: SHADOW_COLOR,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  large: {
    shadowColor: SHADOW_COLOR,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
};

// CSS 그림자 (웹 전용)
export const CSS_SHADOWS = {
  small: '0 2px 2px rgba(181, 160, 141, 0.1)',
  medium: '0 4px 4px rgba(181, 160, 141, 0.15)',
  large: '0 8px 8px rgba(181, 160, 141, 0.2)',
} as const;
