/**
 * 혼밥시러 - 네이티브 앱
 * React Native Navigation 사용
 */

import React, { useEffect } from 'react';
import {
  Platform,
  StatusBar,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { AuthProvider } from './src/contexts/AuthContext';
import AuthNavigator from './src/navigation/AuthNavigator';
// 지도 테스트용 임시 import
import MapTestScreen from './src/screens/MapTestScreen';

// 지도 테스트 모드 - true로 설정하면 바로 지도 테스트 화면 표시
const MAP_TEST_MODE = false;

function App() {
  useEffect(() => {
    // iOS 알림 권한 요청
    if (Platform.OS === 'ios') {
      PushNotificationIOS.requestPermissions({
        alert: true,
        badge: true,
        sound: true,
      }).then((permissions) => {
        console.log('🔑 [APP] iOS 알림 권한:', permissions);
      });
    }
  }, []);

  // 지도 테스트 모드일 때 바로 MapTestScreen 표시
  if (MAP_TEST_MODE) {
    return (
      <>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <MapTestScreen />
      </>
    );
  }

  return (
    <AuthProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <NavigationContainer>
        <AuthNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}

export default App;