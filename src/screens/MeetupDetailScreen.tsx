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
  const meetupId = route.params?.meetupId || route.params?.id;

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