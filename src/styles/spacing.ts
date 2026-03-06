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

// 모서리 곡률 — 프로덕션급 라운딩
// 원칙: 리스트=none, 태그=xs, 인풋=sm, 카드=md, 모달=xl, 칩=pill, 아바타=full
export const BORDER_RADIUS = {
  none: 0,        // 플랫 리스트 아이템, 구분선 기반 UI
  xs: 2,          // 미세한 라운딩
  sm: 4,          // 태그, 뱃지
  md: 8,          // 카드, CTA 버튼, 이미지
  lg: 10,         // 큰 카드 (기존 호환)
  xl: 12,         // 모달, 바텀시트 컨텐츠
  xxl: 16,        // 바텀시트 상단
  pill: 20,       // 칩, 필터 pill
  full: 9999,     // 원형 (아바타)
} as const;

// 플랫 리스트 아이템 스타일 (구분선 기반 — 토스/당근 스타일)
export const LIST_ITEM_STYLE = {
  paddingVertical: 16,
  paddingHorizontal: 20,
  borderBottomWidth: 1,
  borderBottomColor: 'rgba(17,17,17,0.06)',
  backgroundColor: '#FFFFFF',
} as const;

// 통일 헤더 스타일 — 메인 탭 (홈, 탐색, 채팅, 마이페이지)
export const HEADER_STYLE = {
  main: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.06)',
  },
  // 서브 화면 (뒤로가기 있는 화면)
  sub: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.06)',
  },
  // 헤더 타이틀 (메인 탭)
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    color: '#1A1714',
  },
  // 서브 타이틀 (뒤로가기 화면)
  subTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    color: '#1A1714',
  },
} as const;
