import React from 'react';
import { useNavigate } from 'react-router-dom';
import UniversalSettingsScreen from '../components/shared/UniversalSettingsScreen';
import { useUserStore } from '../store/userStore';

const SettingsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useUserStore();

  const navigation = {
    navigate: (screen: string, params?: any) => {
      const routes: { [key: string]: string } = {
        'NotificationSettings': '/notification-settings',
        'PrivacySettings': '/privacy-settings',
        'BlockedUsers': '/blocked-users',
        'Notices': '/notices',
        'Login': '/login',
        'Home': '/home',
        'MyPage': '/mypage',
      };
      const path = routes[screen] || `/${screen.toLowerCase().replace(/([A-Z])/g, '-$1').replace(/^-/, '')}`;
      navigate(path, { state: params });
    },
    goBack: () => {
      navigate(-1);
    },
  };

  const handleLogout = () => {
    logout();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('user-storage');
    navigate('/login');
  };

  return (
    <UniversalSettingsScreen
      navigation={navigation}
      onLogout={handleLogout}
    />
  );
};

export default SettingsScreen;
