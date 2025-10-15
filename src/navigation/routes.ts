export const ROUTES = {
  // Tab Routes
  HOME: 'Home' as const,
  SEARCH: 'Search' as const,
  CHAT: 'Chat' as const,
  MY_PAGE: 'MyPage' as const,
  
  // Stack Routes
  MAIN: 'Main' as const,
  LOGIN: 'Login' as const,
  MEETUP_DETAIL: 'MeetupDetail' as const,
  CREATE_MEETUP: 'CreateMeetup' as const,
  PROFILE: 'Profile' as const,
  CHAT_ROOM: 'ChatRoom' as const,
  NOTIFICATION: 'Notification' as const,
} as const;

export const TAB_ROUTES = [
  {
    name: ROUTES.HOME,
    title: '홈',
    icon: '🏠',
    headerTitle: '혼밥시러',
  },
  {
    name: ROUTES.SEARCH,
    title: '탐색',
    icon: '🔍',
    headerTitle: '모임 찾기',
  },
  {
    name: ROUTES.CHAT,
    title: '채팅',
    icon: '💬',
    headerTitle: '채팅',
  },
  {
    name: ROUTES.MY_PAGE,
    title: '마이페이지',
    icon: '👤',
    headerTitle: '마이페이지',
  },
] as const;