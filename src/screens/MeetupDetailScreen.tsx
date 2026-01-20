import React from 'react';
import { Modal } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useTypedNavigation } from '../hooks/useNavigation';
import UniversalMeetupDetailScreen from '../components/shared/UniversalMeetupDetailScreen';
import { DepositSelector } from '../components/DepositSelector';
import StaticMapView from '../components/StaticMapView';

const MeetupDetailScreen = () => {
  const route = useRoute<any>();
  const navigation = useTypedNavigation();

  // meetupId 추출 및 유효성 검사
  let rawMeetupId = route.params?.meetupId || route.params?.id;

  // 객체인 경우 문자열로 변환 시도
  if (typeof rawMeetupId === 'object' && rawMeetupId !== null) {
    console.warn('⚠️ MeetupDetailScreen: meetupId가 객체로 전달됨:', rawMeetupId);
    rawMeetupId = rawMeetupId.id || rawMeetupId.meetupId || String(rawMeetupId);
  }

  const meetupId = typeof rawMeetupId === 'string' ? rawMeetupId : undefined;

  console.log('🔍 MeetupDetailScreen params:', {
    rawParams: route.params,
    extractedId: meetupId,
    idType: typeof rawMeetupId
  });

  const navigationAdapter = {
    navigate: (screen: string, params?: any) => {
      navigation.navigate(screen as any, params);
    },
    goBack: () => {
      navigation.goBack();
    }
  };

  return (
    <UniversalMeetupDetailScreen
      navigation={navigationAdapter}
      meetupId={meetupId}
      ModalComponent={Modal}
      DepositSelectorComponent={DepositSelector}
      KakaoMapComponent={StaticMapView}
    />
  );
};

export default MeetupDetailScreen;