// 혼밥시러 따뜻한 밥 컬러 팔레트
export const COLORS = {
  // 메인 골든 컬러 (밥 느낌)
  primary: {
    main: '#F5CB76',      // 따뜻한 골든 옐로우 (밥 색깔)
    light: '#F8E5A3',     // 연한 골든
    dark: '#E6B85C',      // 진한 골든
    accent: '#F2D68A',    // 포인트 골든
  },
  
  // 보조 컬러 (따뜻한 브라운 계열)
  secondary: {
    main: '#D4A574',      // 따뜻한 브라운
    light: '#F9E5B8',     // 연한 크림 베이지
    dark: '#B8956A',      // 진한 브라운
    warm: '#FDF2D9',      // 따뜻한 크림
  },
  
  // 중성 컬러
  neutral: {
    white: '#FFFFFF',
    light: '#FEFCF7',     // 따뜻한 오프화이트
    background: '#FDF9F0', // 따뜻한 베이지 배경
    grey100: '#F5F2EB',
    grey200: '#EFEBE0',
    grey300: '#E0DAC7',
    grey400: '#C5B896',
    grey500: '#A69B7B',
    grey600: '#8B7D5B',
    grey700: '#6B5E42',
    grey800: '#4A3F2A',
    grey900: '#2D2419',
    black: '#1A1510',
  },
  
  // 기능적 컬러
  functional: {
    success: '#98C379',   // 자연스러운 초록
    warning: '#E5C07B',   // 따뜻한 노란색
    error: '#E06C75',     // 부드러운 빨강
    info: '#61AFEF',      // 부드러운 파랑
  },
  
  // 텍스트 컬러
  text: {
    primary: '#3D2914',   // 진한 브라운
    secondary: '#6B5E42', // 중간 브라운
    tertiary: '#8B7D5B',  // 연한 브라운
    white: '#FFFFFF',
    light: '#F8F8F8',
  },
  
  // 그라데이션
  gradient: {
    primary: ['#F5CB76', '#F8E5A3'],
    secondary: ['#F9E5B8', '#FDF2D9'],
    warm: ['#E6B85C', '#F5CB76'],
    sunset: ['#F5CB76', '#F2D68A', '#F9E5B8'],
  },
} as const;

// 투명도 헬퍼
export const withOpacity = (color: string, opacity: number) => {
  return `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
};

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