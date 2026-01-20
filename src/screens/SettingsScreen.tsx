import React from 'react';
import { useTypedNavigation } from '../hooks/useNavigation';
import UniversalSettingsScreen from '../components/shared/UniversalSettingsScreen';

const SettingsScreen = () => {
  const navigation = useTypedNavigation();

  const navigationAdapter = {
    navigate: (screen: string, params?: any) => {
      navigation.navigate(screen as any, params);
    },
    goBack: () => {
      navigation.goBack();
    },
  };

  return <UniversalSettingsScreen navigation={navigationAdapter} />;
};

export default SettingsScreen;
