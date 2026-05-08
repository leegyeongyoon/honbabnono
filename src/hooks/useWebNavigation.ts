// 웹용 네비게이션 훅 — react-router-dom 기반
// webpack alias: ../hooks/useNavigation → ../hooks/useWebNavigation

const SCREEN_ROUTE_MAP: Record<string, string | ((params?: any) => string)> = {
  Home: '/home',
  Notifications: '/notifications',
  MeetupDetail: (p: any) => `/meetup/${p?.meetupId}`,
  CreateMeetup: '/create-meetup',
  Chat: (p: any) => `/chat/${p?.meetupId}`,
  Settings: '/settings',
  HostProfile: (p: any) => `/host-profile/${p?.userId}`,
  EditProfile: '/mypage',
  Profile: '/mypage',
  MyMeetups: '/my-meetups',
  Wishlist: '/wishlist',
  PointCharge: '/point-charge',
  PointHistory: '/point-history',
  PointBalance: '/point-balance',
  MyReviews: '/my-reviews',
  RecentViews: '/recent-views',
  Notices: '/notices',
  FAQ: '/faq',
  Terms: '/terms',
  Explore: '/explore',
  Payment: '/payment',
  ReviewManagement: '/review-management',
  MyBadges: '/my-badges',
  BlockedUsers: '/blocked-users',
  NotificationSettings: '/notification-settings',
  PrivacySettings: '/privacy-settings',
  Login: '/login',
  Onboarding: '/onboarding',
  RestaurantDetail: (p: any) => `/restaurant/${p?.restaurantId || p?.id}`,
  ReservationForm: (p: any) => `/reservation/${p?.restaurantId}`,
  ReservationPayment: (p: any) => `/payment/${p?.reservationId}`,
  ReservationConfirm: (p: any) => `/reservation-confirm/${p?.reservationId}`,
  MyReservations: '/my-reservations',
  SearchRestaurants: '/search-restaurants',
};

export const useNavigation = () => {
  return {
    navigate: (screen: string, params?: any) => {
      const route = SCREEN_ROUTE_MAP[screen];
      if (route) {
        const path = typeof route === 'function' ? route(params) : route;
        window.location.href = path;
      }
    },
    goBack: () => {
      window.history.back();
    },
  };
};

export const useTypedNavigation = () => {
  const nav = useNavigation();
  return {
    ...nav,
    navigateToHome: () => nav.navigate('Home'),
    navigateToSearch: () => nav.navigate('SearchRestaurants'),
    navigateToChat: (params?: any) => nav.navigate('Chat', params),
    navigateToMyPage: () => nav.navigate('Profile'),
  };
};
