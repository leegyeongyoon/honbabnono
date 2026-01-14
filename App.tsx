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