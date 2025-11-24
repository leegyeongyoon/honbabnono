// 혼밥시러 세련된 베이지 컬러 팔레트 (새로운 정제된 색감)
export const COLORS = {
  // 메인 컬러 (세련된 베이지 톤)
  primary: {
    main: '#C9B59C',      // 세련된 베이지 (일반 버튼, 메인 액션)
    light: '#F9F8F6',     // 가장 연한 크림 (배경, 연한 요소)
    dark: '#D9CFC7',      // 중간 베이지 (강조 요소)
    accent: '#EFE9E3',    // 따뜻한 오프화이트 (카드 배경용)
  },
  
  // 보조 컬러 (확장된 베이지 톤)
  secondary: {
    main: '#D9CFC7',      // 중간 베이지
    light: '#F9F8F6',     // 가장 연한 크림
    dark: '#C9B59C',      // 진한 베이지
    warm: '#EFE9E3',      // 따뜻한 오프화이트
  },
  
  // 중성 컬러 (세련된 베이지 톤 기반)
  neutral: {
    white: '#FFFFFF',     // 순수한 화이트
    light: '#F9F8F6',     // 가장 연한 크림
    background: '#F9F8F6', // 새로운 배경색
    grey100: '#EFE9E3',   // 따뜻한 오프화이트
    grey200: '#D9CFC7',   // 중간 베이지
    grey300: '#C9B59C',   // 세련된 베이지
    grey400: '#B5A08D',   // 약간 진한 베이지
    grey500: '#A08B7A',   // 더 진한 베이지
    grey600: '#8B7866',   // 브라운 베이지
    grey700: '#766653',   // 진한 브라운
    grey800: '#61543F',   // 매우 진한 브라운
    grey900: '#4C422C',   // 다크 브라운
    black: '#2A2520',     // 새로운 블랙
  },
  
  // 기능적 컬러 (세련된 베이지톤에 맞게 조정)
  functional: {
    success: '#7A8A6E',   // 베이지톤에 맞는 자연스러운 초록
    warning: '#C9B59C',   // 베이지 계열의 경고색
    error: '#B5857A',     // 베이지톤에 맞는 차분한 빨강
    info: '#8B9AAB',      // 베이지톤에 맞는 차분한 파랑
  },
  
  // 텍스트 컬러 (세련된 베이지 색감 기반)
  text: {
    primary: '#4C422C',   // 다크 브라운 (가장 진한 텍스트)
    secondary: '#766653', // 진한 브라운 (보조 텍스트)
    tertiary: '#A08B7A',  // 연한 브라운 (부가 텍스트)
    white: '#FFFFFF',     // 순수한 화이트
    light: '#F9F8F6',     // 연한 크림
    error: '#B5857A',     // 에러 텍스트용
  },
  
  // 그라데이션 (세련된 베이지 색감)
  gradient: {
    primary: ['#C9B59C', '#F9F8F6'],           // 메인 베이지 그라데이션
    secondary: ['#D9CFC7', '#EFE9E3'],         // 연한 베이지 그라데이션  
    warm: ['#B5A08D', '#C9B59C'],              // 따뜻한 베이지 그라데이션
    sunset: ['#F9F8F6', '#EFE9E3', '#D9CFC7'], // 자연스러운 3단계 그라데이션
    accent: ['#766653', '#A08B7A'],            // 강조용 진한 그라데이션
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