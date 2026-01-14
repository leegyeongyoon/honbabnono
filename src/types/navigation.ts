export type RootTabParamList = {
  Home: undefined;
  Search: {
    category?: string;
    location?: string;
    timeSlot?: string;
  };
  Chat: {
    chatId?: string;
  };
  MyPage: undefined;
};

export type RootStackParamList = {
  Main: undefined;
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
  KakaoLoginWebView: undefined;
  Login: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootTabParamList {}
  }
}