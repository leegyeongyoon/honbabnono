import React from 'react';
import { useUserStore } from '../store/userStore';
import UniversalLoginScreen from '../components/shared/UniversalLoginScreen';
import storage from '../utils/storage';

interface LoginScreenProps {
  navigation?: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { setUser, setToken } = useUserStore();

  const handleLogin = async (userData: any, token?: string) => {
    // 사용자 정보 저장
    await setUser(userData);

    // 토큰이 있으면 저장
    if (token) {
      setToken(token);
      await storage.setItem('token', token);
    }
  };

  return (
    <UniversalLoginScreen
      navigation={navigation}
      onLogin={handleLogin}
    />
  );
};

export default LoginScreen;