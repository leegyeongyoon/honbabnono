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
  NativeModules,
} from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Firebase messaging removed for compatibility
import Geolocation from '@react-native-community/geolocation';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import NotificationTestScreen from './src/screens/NotificationTestScreen';

const { NativeBridgeModule, SimpleNotificationModule } = NativeModules;

const WEBVIEW_URL = __DEV__ 
  ? 'http://localhost:3000' 
  : 'https://honbabnono.com';

function App() {
  const webviewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  
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

  // Firebase messaging removed for React Native 0.71 compatibility

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

        case 'SHOW_ALERT':
          // 네이티브 알림 팝업
          Alert.alert(
            message.title || '알림',
            message.message,
            [
              {
                text: message.buttonText || '확인',
                onPress: () => {
                  webviewRef.current?.postMessage(JSON.stringify({
                    type: 'ALERT_RESULT',
                    result: 'ok',
                  }));
                }
              }
            ]
          );
          break;

        case 'SHOW_CONFIRM':
          // 네이티브 확인 팝업
          Alert.alert(
            message.title || '확인',
            message.message,
            [
              {
                text: message.cancelText || '취소',
                style: 'cancel',
                onPress: () => {
                  webviewRef.current?.postMessage(JSON.stringify({
                    type: 'CONFIRM_RESULT',
                    result: 'cancel',
                  }));
                }
              },
              {
                text: message.confirmText || '확인',
                onPress: () => {
                  webviewRef.current?.postMessage(JSON.stringify({
                    type: 'CONFIRM_RESULT',
                    result: 'confirm',
                  }));
                }
              }
            ]
          );
          break;

        case 'SHOW_NOTIFICATION':
          // 네이티브 모듈을 통한 알림 표시
          Alert.alert(
            '알림 테스트',
            `제목: ${message.title}\n내용: ${message.body}`,
            [{ text: '확인' }]
          );
          break;

        case 'SCHEDULE_NOTIFICATION':
          // 실제 네이티브 브릿지를 통한 알림 스케줄링
          console.log('🔔 [WebView] SCHEDULE_NOTIFICATION 메시지 수신:', message);
          console.log('🔍 [WebView] 모든 NativeModules:', Object.keys(NativeModules));
          console.log('🔍 [WebView] NativeBridgeModule 확인:', !!NativeBridgeModule);
          console.log('🔍 [WebView] SimpleNotificationModule 확인:', !!SimpleNotificationModule);
          
          // iOS 시스템 알림 기반 알림 기능 구현
          console.log('✅ [WebView] iOS 시스템 알림 스케줄링');
          
          if (Platform.OS === 'ios') {
            // iOS 시스템 알림만 사용 (Alert 제거)
            console.log('📱 [WebView] iOS 시스템 알림 스케줄링');
            
            // 5초 후 iOS 시스템 알림  
            setTimeout(() => {
              console.log(`🔔 [WebView] ${message.delay}초 후 iOS 시스템 알림 실행`);
              PushNotificationIOS.presentLocalNotification({
                alertBody: message.body || '혼밥노노 iOS 시스템 알림입니다! 🍚',
                alertTitle: message.title || '혼밥노노 알림',
                soundName: 'default'
              });
              console.log(`🎯 [WebView] ${message.delay}초 후 iOS 시스템 알림 표시 완료`);
            }, message.delay * 1000);
          } else {
            // 다른 플랫폼에서는 Alert 사용
            setTimeout(() => {
              console.log(`🔔 [WebView] ${message.delay}초 후 예약 알림 실행 시작`);
              Alert.alert(
                message.title || '혼밥노노 알림',
                message.body || '알림 메시지',
                [
                  {
                    text: '확인',
                    onPress: () => console.log('🔔 예약 알림 확인됨')
                  }
                ],
                { cancelable: false }
              );
              console.log(`🎯 [WebView] ${message.delay}초 후 알림 표시 완료`);
            }, message.delay * 1000);
          }
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
      // viewport 메타태그 설정으로 확대/축소 방지
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover');
      } else {
        const meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover';
        document.head.appendChild(meta);
      }

      // 확대/축소 제스처 완전 차단
      document.addEventListener('touchstart', function(event) {
        if (event.touches.length > 1) {
          event.preventDefault();
        }
      }, { passive: false });

      let lastTouchEnd = 0;
      document.addEventListener('touchend', function(event) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
          event.preventDefault();
        }
        lastTouchEnd = now;
      }, { passive: false });

      // 더블탭 확대 방지
      document.addEventListener('dblclick', function(event) {
        event.preventDefault();
      }, { passive: false });

      // input 포커스 시에도 확대 방지
      document.addEventListener('focusin', function(event) {
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
          setTimeout(() => {
            window.scrollTo(0, 0);
          }, 100);
        }
      });

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
        },
        // 네이티브 팝업 표시
        showAlert: function(title, message, buttonText = '확인') {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'SHOW_ALERT',
            title: title,
            message: message,
            buttonText: buttonText
          }));
        },
        // 네이티브 확인 팝업
        showConfirm: function(title, message, confirmText = '확인', cancelText = '취소') {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'SHOW_CONFIRM',
            title: title,
            message: message,
            confirmText: confirmText,
            cancelText: cancelText
          }));
        },
        // 알림 표시
        showNotification: function(title, body, data) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'SHOW_NOTIFICATION',
            title: title,
            body: body,
            data: data
          }));
        },
        // 지연 알림
        scheduleNotification: function(title, body, delay, data) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'SCHEDULE_NOTIFICATION',
            title: title,
            body: body,
            delay: delay,
            data: data
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
        scalesPageToFit={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        scrollEnabled={true}
        bounces={false}
        mixedContentMode="always"
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        // iOS 설정
        allowsBackForwardNavigationGestures={true}
        automaticallyAdjustContentInsets={false}
        dataDetectorTypes="none"
        // Android 설정
        androidHardwareAccelerationDisabled={false}
        overScrollMode="never"
        nestedScrollEnabled={true}
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

export default App;
