import React from 'react';
import { useTypedNavigation } from '../hooks/useNavigation';
import UniversalMyPageScreen from '../components/shared/UniversalMyPageScreen';

const MyPageScreen = (props) => {
  const navigation = useTypedNavigation();
  
  const navigationAdapter = {
    navigate: (screen, params) => {
      navigation.navigate(screen, params);
    },
    goBack: () => {
      navigation.goBack();
    }
  };

  const handleLogout = () => {
    // 네이티브 로그아웃 처리
    navigation.navigate('Login');
  };

  return (
    <UniversalMyPageScreen
      navigation={navigationAdapter}
      onLogout={handleLogout}
      {...props}
    />
  );
};

export default MyPageScreen;