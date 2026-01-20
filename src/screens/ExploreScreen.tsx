import React from 'react';
import { useTypedNavigation } from '../hooks/useNavigation';
import UniversalExploreScreen from '../components/shared/UniversalExploreScreen';

const ExploreScreen = (props: any) => {
  const navigation = useTypedNavigation();

  const navigationAdapter = {
    navigate: (screen: string, params?: any) => {
      navigation.navigate(screen as any, params);
    }
  };

  return (
    <UniversalExploreScreen
      navigation={navigationAdapter}
      {...props}
    />
  );
};

export default ExploreScreen;
