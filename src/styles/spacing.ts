// 간격 시스템 v4 — 프리미엄 여백감
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,

  screen: {
    horizontal: 20,
    vertical: 16,
  },

  card: {
    padding: 16,
    margin: 12,
  },

  tab: {
    height: 48,
    paddingVertical: 8,
  },

  header: {
    height: 56,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },

  bottomNav: {
    height: 60,
  },

  grid: {
    gap: 12,
    rowGap: 14,
  },

  section: {
    gap: 32,
    paddingTop: 28,
    paddingBottom: 24,
  },

  hero: {
    paddingTop: 36,
    paddingBottom: 44,
    paddingHorizontal: 24,
    searchOverlap: -22,
  },
} as const;

// 모서리 곡률 — 모던 라운딩
export const BORDER_RADIUS = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 10,
  xl: 12,
  xxl: 16,
  full: 9999,
} as const;
