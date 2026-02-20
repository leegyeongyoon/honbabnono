import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../styles/colors';
import LoginScreen from '../screens/LoginScreen';
import KakaoLoginWebView from '../screens/KakaoLoginWebView';
import RootNavigator from './RootNavigator';

const Stack = createNativeStackNavigator();

const AuthNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // 로딩 중일 때
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary.main} />
        <Text style={styles.loadingText}>잇테이블 시작 중...</Text>
      </View>
    );
  }

  // 인증되지 않은 경우 로그인 스택
  if (!isAuthenticated) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="KakaoLoginWebView" component={KakaoLoginWebView} />
      </Stack.Navigator>
    );
  }

  // 인증된 경우 메인 앱
  return <RootNavigator />;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.white,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
});

export default AuthNavigator;