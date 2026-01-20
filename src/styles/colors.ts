// 혼밥시러 골드 & 브라운 컬러 팔레트
export const COLORS = {
  // 메인 컬러 (따뜻한 골드 브라운 톤)
  primary: {
    main: '#876445',      // 다크 브라운 (일반 버튼, 메인 액션)
    light: '#FFFFFF',     // 흰색 (배경, 연한 요소)
    dark: '#6A4E36',      // 더 진한 브라운 (강조 요소)
    accent: '#EEC373',    // 골드 옐로우 (카드 배경용)
  },

  // 보조 컬러 (캐러멜 톤)
  secondary: {
    main: '#CA965C',      // 캐러멜 탄색
    light: '#FFFFFF',     // 흰색
    dark: '#876445',      // 다크 브라운
    warm: '#EEC373',      // 골드 옐로우
  },

  // 중성 컬러 (골드 브라운 톤 기반)
  neutral: {
    white: '#FFFFFF',     // 순수한 화이트
    light: '#FFFFFF',     // 흰색 배경
    background: '#FFFFFF', // 흰색 배경
    grey100: '#EEC373',   // 골드 옐로우
    grey200: '#DDB066',   // 진한 골드
    grey300: '#CA965C',   // 캐러멜 탄색
    grey400: '#A87D4A',   // 중간 브라운
    grey500: '#876445',   // 다크 브라운
    grey600: '#6A4E36',   // 더 진한 브라운
    grey700: '#4E3928',   // 매우 진한 브라운
    grey800: '#3A2A1E',   // 최다크 브라운
    grey900: '#261C14',   // 거의 블랙
    black: '#1A1210',     // 새로운 블랙
  },

  // 기능적 컬러 (골드 브라운톤에 맞게 조정)
  functional: {
    success: '#7A9A6A',   // 자연스러운 그린
    warning: '#EEC373',   // 골드 옐로우
    error: '#C06060',     // 차분한 레드
    info: '#6A8AAA',      // 차분한 블루
  },

  // 텍스트 컬러 (골드 브라운 색감 기반)
  text: {
    primary: '#3A2A1E',   // 매우 진한 브라운 (가장 진한 텍스트)
    secondary: '#6A4E36', // 진한 브라운 (보조 텍스트)
    tertiary: '#876445',  // 다크 브라운 (부가 텍스트)
    white: '#FFFFFF',     // 순수한 화이트
    light: '#F4DFBA',     // 연한 크림
    error: '#C06060',     // 에러 텍스트용
  },

  // 그라데이션 (골드 브라운 색감)
  gradient: {
    primary: ['#876445', '#F4DFBA'],           // 브라운-크림 그라데이션
    secondary: ['#CA965C', '#EEC373'],         // 캐러멜-골드 그라데이션
    warm: ['#876445', '#CA965C'],              // 브라운-캐러멜 그라데이션
    sunset: ['#F4DFBA', '#EEC373', '#CA965C', '#876445'], // 4단계 그라데이션
    accent: ['#6A4E36', '#876445'],            // 강조용 브라운 그라데이션
  },
} as const;

// 투명도 헬퍼
export const withOpacity = (color: string, opacity: number) => {
  return `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
};

// 레이아웃 상수
export const LAYOUT = {
  HEADER_HEIGHT: 72, // 고정 헤더 높이 (모든 화면 동일)
  HEADER_PADDING_VERTICAL: 12, // 헤더 상하 패딩
  HEADER_PADDING_HORIZONTAL: 20, // 헤더 좌우 패딩
  CONTENT_TOP_MARGIN: 20, // 컨텐츠 상단 마진
} as const;

// 그림자 스타일
export const SHADOWS = {
  small: {
    shadowColor: COLORS.neutral.grey400,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: COLORS.neutral.grey400,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  large: {
    shadowColor: COLORS.neutral.grey400,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
};
