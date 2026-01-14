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
    console.log('🔐 [LoginScreen] 로그인 처리 시작:', { userName: userData.name, hasToken: !!token });
    
    // 사용자 정보 저장
    await setUser(userData);
    console.log('🔐 [LoginScreen] 사용자 정보 저장 완료');
    
    // 토큰이 있으면 저장
    if (token) {
      setToken(token);
      await storage.setItem('token', token);
      console.log('🔐 [LoginScreen] 토큰 저장 완료:', token.substring(0, 10) + '...');
    } else {
      console.log('⚠️ [LoginScreen] 토큰이 없습니다');
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