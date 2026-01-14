import React from 'react';
import { useTypedNavigation } from '../hooks/useNavigation';
import UniversalMeetupListScreen from '../components/shared/UniversalMeetupListScreen';

const MeetupListScreen = () => {
  const navigation = useTypedNavigation();
  
  const navigationAdapter = {
    navigate: (screen: string, params?: any) => {
      navigation.navigate(screen as any, params);
    },
    goBack: () => {
      navigation.goBack();
    }
  };

  return (
    <UniversalMeetupListScreen
      navigation={navigationAdapter}
    />
  );
};

export default MeetupListScreen;