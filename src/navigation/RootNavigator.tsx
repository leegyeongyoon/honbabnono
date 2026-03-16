import React, {useState, useEffect} from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TabNavigator from './TabNavigator';
import {COLORS} from '../styles/colors';

// Import existing screens
import MeetupDetailScreen from '../screens/MeetupDetailScreen';
import CreateMeetupScreen from '../screens/CreateMeetupScreen';
import CreateMeetupWizard from '../screens/CreateMeetupWizard';
import ChatScreen from '../screens/ChatScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MeetupListScreen from '../screens/MeetupListScreen';
import NotificationScreen from '../screens/NotificationScreen';
import PaymentScreen from '../screens/PaymentScreen';
import DepositPaymentScreen from '../screens/DepositPaymentScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import PrivacySettingsScreen from '../screens/PrivacySettingsScreen';
import MyReviewsScreen from '../screens/MyReviewsScreen';
import MyMeetupsScreen from '../screens/MyMeetupsScreen';
import MyActivitiesScreen from '../screens/MyActivitiesScreen';
import MyBadgesScreen from '../screens/MyBadgesScreen';
import JoinedMeetupsScreen from '../screens/JoinedMeetupsScreen';
import RecentViewsScreen from '../screens/RecentViewsScreen';
import WishlistScreen from '../screens/WishlistScreen';
import PointHistoryScreen from '../screens/PointHistoryScreen';
import PointBalanceScreen from '../screens/PointBalanceScreen';
import PointChargeScreen from '../screens/PointChargeScreen';
import BlockedUsersScreen from '../screens/BlockedUsersScreen';
import NoticesScreen from '../screens/NoticesScreen';
import NoticeDetailScreen from '../screens/NoticeDetailScreen';
import ReviewManagementScreen from '../screens/ReviewManagementScreen';
import UserVerificationScreen from '../screens/UserVerificationScreen';
import AdvertisementDetailScreen from '../screens/AdvertisementDetailScreen';
import AISearchResultScreen from '../screens/AISearchResultScreen';
import WriteReviewScreen from '../screens/WriteReviewScreen';
import SettingsScreen from '../screens/SettingsScreen';
import HostProfileScreen from '../screens/HostProfileScreen';
import OnboardingScreen from '../screens/OnboardingScreen';

const ONBOARDING_STORAGE_KEY = 'has_seen_onboarding';

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  MeetupDetail: { meetupId?: string };
  MeetupList: { category?: string };
  CreateMeetup: undefined;
  CreateMeetupWizard: undefined;
  Profile: { userId?: string };
  ChatRoom: { meetupId?: string; meetupTitle?: string };
  Chat: { chatId?: string };
  Notification: undefined;
  Payment: { meetupId?: string };
  DepositPayment: { meetupId?: string; depositAmount?: number };
  NotificationSettings: undefined;
  PrivacySettings: undefined;
  MyReviews: undefined;
  MyMeetups: undefined;
  MyActivities: undefined;
  MyBadges: undefined;
  JoinedMeetups: undefined;
  RecentViews: undefined;
  Wishlist: undefined;
  PointHistory: undefined;
  PointBalance: undefined;
  PointCharge: undefined;
  BlockedUsers: undefined;
  Notices: undefined;
  NoticeDetail: { noticeId?: string };
  ReviewManagement: undefined;
  UserVerification: undefined;
  AdvertisementDetail: { adId?: string };
  AISearchResult: { query?: string; autoSearch?: boolean };
  WriteReview: { meetupId: string; meetupTitle?: string };
  HostProfile: { userId: string };
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const value = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
        setHasSeenOnboarding(value === 'true');
      } catch (_e) {
        setHasSeenOnboarding(true); // 에러 시 온보딩 건너뛰기
      }
    };
    checkOnboarding();
  }, []);

  // 온보딩 상태 확인 중 로딩
  if (hasSeenOnboarding === null) {
    return null;
  }

  return (
    <Stack.Navigator
      initialRouteName={hasSeenOnboarding ? 'Main' : 'Onboarding'}
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.primary.light,
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '700',
          color: COLORS.text.primary,
          letterSpacing: -0.3,
        },
        headerTintColor: COLORS.text.primary,
        headerShadowVisible: true,
        animation: 'slide_from_right',
        animationDuration: 280,
      }}>
      {!hasSeenOnboarding && (
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ headerShown: false }}
        />
      )}
      <Stack.Screen
        name="Main"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MeetupDetail"
        component={MeetupDetailScreen}
        options={{ title: '약속 상세' }}
      />
      <Stack.Screen
        name="MeetupList"
        component={MeetupListScreen}
        options={{ title: '약속 목록' }}
      />
      <Stack.Screen
        name="CreateMeetup"
        component={CreateMeetupWizard}
        options={{ title: '약속 만들기' }}
      />
      <Stack.Screen
        name="CreateMeetupWizard"
        component={CreateMeetupWizard}
        options={{ title: '약속 만들기' }}
      />
      <Stack.Screen
        name="ChatRoom"
        component={ChatScreen}
        options={({ route }) => ({ 
          title: route.params?.meetupTitle || '채팅방' 
        })}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ title: '채팅' }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: '프로필' }}
      />
      <Stack.Screen
        name="Notification"
        component={NotificationScreen}
        options={{ title: '알림' }}
      />
      <Stack.Screen
        name="Payment"
        component={PaymentScreen}
        options={{ title: '결제' }}
      />
      <Stack.Screen
        name="DepositPayment"
        component={DepositPaymentScreen}
        options={{ title: '예치금 결제' }}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ title: '알림 설정' }}
      />
      <Stack.Screen
        name="PrivacySettings"
        component={PrivacySettingsScreen}
        options={{ title: '개인정보 설정' }}
      />
      <Stack.Screen
        name="MyReviews"
        component={MyReviewsScreen}
        options={{ title: '내 리뷰' }}
      />
      <Stack.Screen
        name="MyMeetups"
        component={MyMeetupsScreen}
        options={{ title: '내 약속' }}
      />
      <Stack.Screen
        name="MyActivities"
        component={MyActivitiesScreen}
        options={{ title: '내 활동' }}
      />
      <Stack.Screen
        name="MyBadges"
        component={MyBadgesScreen}
        options={{ title: '내 뱃지' }}
      />
      <Stack.Screen
        name="JoinedMeetups"
        component={JoinedMeetupsScreen}
        options={{ title: '참여한 약속' }}
      />
      <Stack.Screen
        name="RecentViews"
        component={RecentViewsScreen}
        options={{ title: '최근 본 약속' }}
      />
      <Stack.Screen
        name="Wishlist"
        component={WishlistScreen}
        options={{ title: '찜 목록' }}
      />
      <Stack.Screen
        name="PointHistory"
        component={PointHistoryScreen}
        options={{ title: '포인트 내역' }}
      />
      <Stack.Screen
        name="PointBalance"
        component={PointBalanceScreen}
        options={{ title: '포인트 잔액' }}
      />
      <Stack.Screen
        name="PointCharge"
        component={PointChargeScreen}
        options={{ title: '포인트 충전' }}
      />
      <Stack.Screen
        name="BlockedUsers"
        component={BlockedUsersScreen}
        options={{ title: '차단 목록' }}
      />
      <Stack.Screen
        name="Notices"
        component={NoticesScreen}
        options={{ title: '공지사항' }}
      />
      <Stack.Screen
        name="NoticeDetail"
        component={NoticeDetailScreen}
        options={{ title: '공지사항 상세' }}
      />
      <Stack.Screen
        name="ReviewManagement"
        component={ReviewManagementScreen}
        options={{ title: '리뷰 관리' }}
      />
      <Stack.Screen
        name="UserVerification"
        component={UserVerificationScreen}
        options={{ title: '본인 인증' }}
      />
      <Stack.Screen
        name="AdvertisementDetail"
        component={AdvertisementDetailScreen}
        options={{ title: '광고 상세' }}
      />
      <Stack.Screen
        name="AISearchResult"
        component={AISearchResultScreen}
        options={{ title: 'AI 검색 결과' }}
      />
      <Stack.Screen
        name="WriteReview"
        component={WriteReviewScreen}
        options={{ title: '리뷰 작성', headerShown: false }}
      />
      <Stack.Screen
        name="HostProfile"
        component={HostProfileScreen}
        options={{ title: '호스트 프로필', headerShown: false }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: '설정', headerShown: false }}
      />
    </Stack.Navigator>
  );
};

export default RootNavigator;