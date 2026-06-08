export const ROUTES = {
  // v2 Tab Routes (외식예약)
  RESTAURANT_HOME: 'RestaurantHome' as const,
  SEARCH_RESTAURANTS: 'SearchRestaurants' as const,
  MY_RESERVATIONS: 'MyReservations' as const,
  MY_PAGE: 'MyPage' as const,

  // v2 Stack Routes
  MAIN: 'Main' as const,
  LOGIN: 'Login' as const,
  RESTAURANT_DETAIL: 'RestaurantDetail' as const,
  RESERVATION_FORM: 'ReservationForm' as const,
  RESERVATION_CONFIRM: 'ReservationConfirm' as const,
  PAYMENT: 'Payment' as const,
  RESERVATION_CHAT: 'ReservationChat' as const,
  WRITE_RESTAURANT_REVIEW: 'WriteRestaurantReview' as const,
  NOTIFICATION: 'Notification' as const,
} as const;

export const TAB_ROUTES = [
  {
    name: ROUTES.RESTAURANT_HOME,
    title: '홈',
    icon: '🏠',
    headerTitle: '잇테이블',
  },
  {
    name: ROUTES.SEARCH_RESTAURANTS,
    title: '검색',
    icon: '🔍',
    headerTitle: '매장 검색',
  },
  {
    name: ROUTES.MY_RESERVATIONS,
    title: '내 예약',
    icon: '📋',
    headerTitle: '내 예약',
  },
  {
    name: ROUTES.MY_PAGE,
    title: '마이',
    icon: '👤',
    headerTitle: '마이페이지',
  },
] as const;