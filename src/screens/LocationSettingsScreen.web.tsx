import React from 'react';
import { useNavigate } from 'react-router-dom';
import UniversalLocationSettingsScreen from '../components/shared/UniversalLocationSettingsScreen';
import { useUserStore } from '../store/userStore';

const LocationSettingsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUserStore();

  const navigation = {
    navigate: (screen: string, params?: any) => {
      const routes: { [key: string]: string } = {
        'Home': '/',
        'MyPage': '/mypage',
        'LocationSettings': '/location-settings',
      };
      const path = routes[screen] || `/${screen.toLowerCase()}`;
      navigate(path, { state: params });
    },
    goBack: () => navigate(-1),
  };

  return (
    <UniversalLocationSettingsScreen
      navigation={navigation}
      user={user}
    />
  );
};

export default LocationSettingsScreen;
