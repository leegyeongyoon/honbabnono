// 간격 시스템 (Figma 스펙 기반)
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,

  // 특정 용도별 간격
  screen: {
    horizontal: 20,
    vertical: 16,
  },

  card: {
    padding: 16,
    margin: 12,
  },

  tab: {
    height: 56,
    paddingVertical: 8,
  },

  header: {
    height: 72,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },

  bottomNav: {
    height: 60,
  },
} as const;

// 둥근 모서리 (Figma 스펙 기반)
export const BORDER_RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
} as const;