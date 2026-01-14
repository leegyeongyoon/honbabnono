import React from 'react';
import { useTypedNavigation } from '../hooks/useNavigation';
import UniversalSearchScreen from '../components/shared/UniversalSearchScreen';

const SearchScreen = (props) => {
  const navigation = useTypedNavigation();
  
  const navigationAdapter = {
    navigate: (screen, params) => {
      navigation.navigate(screen, params);
    }
  };

  return (
    <UniversalSearchScreen
      navigation={navigationAdapter}
      {...props}
    />
  );
};

export default SearchScreen;