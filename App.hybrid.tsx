/**
 * 혼밥시러 - 하이브리드 앱
 * WebView + Native 기능 조합
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  Platform,
  Alert,
  BackHandler,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import Geolocation from '@react-native-community/geolocation';

const WEBVIEW_URL = __DEV__ 
  ? 'http://localhost:3000' 
  : 'https://honbabnono.com';

function HybridApp() {
  const webviewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  
  useEffect(() => {
    // 푸시 알림 권한 요청
    requestPushPermission();
    
    // 백 버튼 핸들러 (Android)
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack && webviewRef.current) {
        webviewRef.current.goBack();
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [canGoBack]);

  // 푸시 알림 권한 요청
  const requestPushPermission = async () => {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        const token = await messaging().getToken();
        console.log('FCM Token:', token);
        // 토큰을 웹뷰로 전달
        webviewRef.current?.postMessage(JSON.stringify({
          type: 'FCM_TOKEN',
          token: token,
        }));
      }
    } catch (error) {
      console.error('Push permission error:', error);
    }
  };

  // 웹뷰와 네이티브 간 통신 브리지
  const handleWebViewMessage = async (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      
      switch (message.type) {
        case 'GET_LOCATION':
          // GPS 위치 가져오기
          Geolocation.getCurrentPosition(
            (position) => {
              webviewRef.current?.postMessage(JSON.stringify({
                type: 'LOCATION_RESULT',
                data: {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                },
              }));
            },
            (error) => {
              webviewRef.current?.postMessage(JSON.stringify({
                type: 'LOCATION_ERROR',
                error: error.message,
              }));
            },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
          );
          break;

        case 'SAVE_TOKEN':
          // 로컬 저장소에 토큰 저장
          await AsyncStorage.setItem('authToken', message.token);
          break;

        case 'GET_TOKEN':
          // 저장된 토큰 가져오기
          const token = await AsyncStorage.getItem('authToken');
          webviewRef.current?.postMessage(JSON.stringify({
            type: 'TOKEN_RESULT',
            token: token,
          }));
          break;

        case 'SHARE':
          // 공유 기능
          if (Platform.OS === 'ios') {
            // iOS 공유
          } else {
            // Android 공유
          }
          break;

        case 'HAPTIC':
          // 햅틱 피드백
          // Haptics.impact(Haptics.ImpactFeedbackStyle.Light);
          break;

        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Message handling error:', error);
    }
  };

  // 웹뷰에 주입할 JavaScript 코드
  const injectedJavaScript = `
    (function() {
      // 네이티브 브리지 객체 생성
      window.NativeBridge = {
        // 위치 정보 가져오기
        getLocation: function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'GET_LOCATION'
          }));
        },
        // 토큰 저장
        saveToken: function(token) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'SAVE_TOKEN',
            token: token
          }));
        },
        // 토큰 가져오기
        getToken: function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'GET_TOKEN'
          }));
        },
        // 공유
        share: function(data) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'SHARE',
            data: data
          }));
        },
        // 햅틱 피드백
        haptic: function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'HAPTIC'
          }));
        }
      };

      // 네이티브에서 메시지 받기
      window.addEventListener('message', function(event) {
        try {
          const data = JSON.parse(event.data);
          // 이벤트 디스패치
          window.dispatchEvent(new CustomEvent('nativeMessage', { detail: data }));
        } catch (error) {
          console.error('Error parsing native message:', error);
        }
      });

      // 디바이스 타입 설정
      window.isNativeApp = true;
      window.deviceType = '${Platform.OS}';
      
      console.log('Native Bridge Initialized');
    })();
    true;
  `;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9F8F6" />
      
      <WebView
        ref={webviewRef}
        source={{ uri: WEBVIEW_URL }}
        style={styles.webview}
        onMessage={handleWebViewMessage}
        injectedJavaScript={injectedJavaScript}
        onNavigationStateChange={(navState) => {
          setCanGoBack(navState.canGoBack);
        }}
        onLoadEnd={() => setIsLoading(false)}
        onLoadStart={() => setIsLoading(true)}
        // 설정
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        mixedContentMode="always"
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        // iOS 설정
        allowsBackForwardNavigationGestures={true}
        // Android 설정
        androidHardwareAccelerationDisabled={false}
        // 디버깅 (개발 모드에서만)
        webviewDebuggingEnabled={__DEV__}
      />

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#C9B59C" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F8F6',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F8F6',
  },
});

export default HybridApp;