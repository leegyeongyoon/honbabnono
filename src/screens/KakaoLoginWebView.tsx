import React, { useRef } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { useUserStore } from '../store/userStore';
import storage from '../utils/storage';
import { COLORS } from '../styles/colors';
import { Icon } from '../components/Icon';

interface KakaoLoginWebViewProps {
  navigation: any;
}

const KakaoLoginWebView: React.FC<KakaoLoginWebViewProps> = ({ navigation }) => {
  const { setUser, setToken } = useUserStore();
  const webViewRef = useRef<WebView>(null);
  
  // 카카오 OAuth URL - React Native에서는 실제 IP 주소 사용
  const kakaoAuthUrl = `http://172.16.1.74:3001/api/auth/kakao`;
  
  // URL 파라미터 파싱 함수 (URLSearchParams 대체)
  const parseUrlParams = (url: string) => {
    const params: { [key: string]: string } = {};
    const queryString = url.split('?')[1] || url.split('#')[1];
    
    if (queryString) {
      queryString.split('&').forEach(pair => {
        const [key, value] = pair.split('=');
        if (key && value) {
          params[key] = decodeURIComponent(value);
        }
      });
    }
    
    return params;
  };

  // WebView에서 URL 변화 감지
  const handleNavigationStateChange = async (navState: any) => {
    const { url } = navState;
    console.log('WebView URL changed:', url);

    // 로그인 성공 후 리다이렉트 URL 체크 (token 파라미터가 있으면 성공)
    if (url.includes('token=') && url.includes('user=')) {
      // URL에서 토큰과 사용자 정보 추출
      const params = parseUrlParams(url);
      const token = params.token;
      const userParam = params.user;
      
      if (token && userParam) {
        try {
          const userData = JSON.parse(userParam);
          console.log('🔐 [KakaoLoginWebView] 로그인 성공, 토큰과 사용자 정보 저장:', { userName: userData.name, hasToken: !!token });
          
          // 사용자 정보와 토큰 저장
          setUser(userData);
          setToken(token);
          await storage.setItem('token', token);
          console.log('🔐 [KakaoLoginWebView] 토큰 저장 완료:', token.substring(0, 10) + '...');
          
          // 로그인 성공 시 단순히 뒤로가기 - AuthNavigator가 자동으로 메인 앱으로 전환
          navigation.goBack();
        } catch (error) {
          console.error('❌ [KakaoLoginWebView] 사용자 데이터 파싱 또는 저장 실패:', error);
          navigation.goBack();
        }
      }
    } else if (url.includes('error=')) {
      // 로그인 실패
      console.error('Kakao login failed');
      navigation.goBack();
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>카카오 로그인</Text>
        <View style={styles.placeholder} />
      </View>
      
      <WebView
        ref={webViewRef}
        source={{ uri: kakaoAuthUrl }}
        onNavigationStateChange={handleNavigationStateChange}
        style={styles.webView}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  placeholder: {
    width: 40,
  },
  webView: {
    flex: 1,
  },
});

export default KakaoLoginWebView;