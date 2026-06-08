export type RootTabParamList = {
  // v2 외식예약 탭
  RestaurantHome: undefined;
  SearchRestaurants: { category?: string };
  MyReservations: undefined;
  MyPage: undefined;
  // v1 (전환 중 — 점진 제거)
  Home: undefined;
  MyMeetups: undefined;
  Search: {
    category?: string;
    location?: string;
    timeSlot?: string;
  };
  Chat: {
    chatId?: string;
  };
};

export type RootStackParamList = {
  Main: undefined;
  Login: undefined;
  KakaoLoginWebView: undefined;
  // v2 외식예약 스택
  RestaurantDetail: { restaurantId: string };
  ReservationForm: { restaurantId: string };
  ReservationConfirm: { reservationId: string };
  Payment: { reservationId: string };
  ReservationChat: { roomId: string };
  WriteRestaurantReview: { reservationId: string };
  // v1 (전환 중)
  MeetupDetail: {
    meetupId: string;
  };
  CreateMeetup: undefined;
  Profile: {
    userId: string;
  };
  ChatRoom: {
    chatId: string;
    title: string;
  };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootTabParamList {}
  }
}