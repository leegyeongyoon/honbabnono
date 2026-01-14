/**
 * 네이티브 브리지 헬퍼
 * 웹과 네이티브 앱 간의 통신을 담당
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// 플랫폼 감지를 위한 간단한 헬퍼
const Platform = {
  OS: typeof window !== 'undefined' ? 'web' : 
      typeof navigator !== 'undefined' && navigator.userAgent.includes('iPhone') ? 'ios' :
      typeof navigator !== 'undefined' && navigator.userAgent.includes('Android') ? 'android' : 'web'
};

// 타입 정의
interface NativeBridge {
  getLocation: () => void;
  saveToken: (token: string) => void;
  getToken: () => void;
  share: (data: any) => void;
  haptic: () => void;
  showNotification: (title: string, body: string, data?: any) => void;
  scheduleNotification: (title: string, body: string, delay: number, data?: any) => void;
}

declare global {
  interface Window {
    NativeBridge?: NativeBridge;
    ReactNativeWebView?: any;
    isNativeApp?: boolean;
    deviceType?: 'ios' | 'android';
  }
}

class NativeBridgeHelper {
  private listeners: Map<string, Function[]> = new Map();

  constructor() {
    // 네이티브 메시지 리스너 등록 (웹 환경에서만)
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('nativeMessage', (event: any) => {
        this.handleNativeMessage(event.detail);
      });
    }
  }

  // 네이티브 앱인지 확인
  isNativeApp(): boolean {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      return true;
    }
    return typeof window !== 'undefined' && window.isNativeApp === true;
  }

  // 디바이스 타입 가져오기
  getDeviceType(): 'ios' | 'android' | 'web' {
    if (Platform.OS === 'ios') return 'ios';
    if (Platform.OS === 'android') return 'android';
    if (!this.isNativeApp()) return 'web';
    return window.deviceType || 'web';
  }

  // 위치 정보 가져오기
  async getLocation(): Promise<{ latitude: number; longitude: number }> {
    return new Promise((resolve, reject) => {
      if (!this.isNativeApp()) {
        // 웹에서는 브라우저 API 사용
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              });
            },
            (error) => reject(error)
          );
        } else {
          reject(new Error('Geolocation not supported'));
        }
      } else {
        // 네이티브 앱에서는 브리지 사용
        this.once('LOCATION_RESULT', (data) => resolve(data));
        this.once('LOCATION_ERROR', (error) => reject(new Error(error)));
        window.NativeBridge?.getLocation();
      }
    });
  }

  // 토큰 저장
  async saveToken(token: string): Promise<void> {
    if (!this.isNativeApp()) {
      // 웹에서는 localStorage 사용
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('authToken', token);
      }
    } else {
      // 네이티브 앱에서는 AsyncStorage 직접 사용
      try {
        await AsyncStorage.setItem('authToken', token);
      } catch (error) {
        console.warn('Failed to save token to AsyncStorage:', error);
        // Fallback to bridge if direct AsyncStorage fails
        window.NativeBridge?.saveToken(token);
      }
    }
  }

  // 토큰 가져오기
  async getToken(): Promise<string | null> {
    if (!this.isNativeApp()) {
      // 웹에서는 localStorage 사용
      if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem('authToken');
      }
      return null;
    } else {
      // 네이티브 앱에서는 AsyncStorage 직접 사용
      try {
        return await AsyncStorage.getItem('authToken');
      } catch (error) {
        console.warn('Failed to get token from AsyncStorage:', error);
        // Fallback to bridge if direct AsyncStorage fails
        return new Promise((resolve) => {
          this.once('TOKEN_RESULT', (data) => resolve(data.token));
          window.NativeBridge?.getToken();
        });
      }
    }
  }

  // 공유
  async share(title: string, text: string, url?: string): Promise<void> {
    const shareData = { title, text, url };

    if (!this.isNativeApp()) {
      // 웹에서는 Web Share API 사용
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // 폴백: 클립보드에 복사
        const textToCopy = `${title}\n${text}\n${url || ''}`;
        await navigator.clipboard.writeText(textToCopy);
        alert('링크가 복사되었습니다!');
      }
    } else {
      // 네이티브 앱에서는 브리지 사용
      window.NativeBridge?.share(shareData);
    }
  }

  // 햅틱 피드백
  haptic(): void {
    if (this.isNativeApp()) {
      window.NativeBridge?.haptic();
    }
  }

  // 즉시 알림 표시
  showNotification(title: string, body: string, data?: any): void {
    console.log('🔔 [nativeBridge] showNotification 호출:', { title, body, isNativeApp: this.isNativeApp() });
    
    if (this.isNativeApp()) {
      // 네이티브 앱에서는 WebView 브리지 사용 (React Native 모듈 직접 접근 불가)
      if (window.NativeBridge) {
        console.log('📱 [nativeBridge] window.NativeBridge.showNotification 호출');
        window.NativeBridge.showNotification(title, body, data);
      } else {
        console.error('❌ [nativeBridge] window.NativeBridge not available');
      }
    } else {
      // 웹에서는 브라우저 알림 사용
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, data });
      } else if ('Notification' in window && Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(title, { body, data });
          }
        });
      } else {
        alert(`${title}\n${body}`);
      }
    }
  }

  // 지연 알림 스케줄링
  scheduleNotification(title: string, body: string, delay: number, data?: any): void {
    console.log('⏰ [nativeBridge] scheduleNotification 호출:', { title, body, delay, isNativeApp: this.isNativeApp() });
    
    if (this.isNativeApp()) {
      // 네이티브 앱에서는 WebView 브리지 사용 (React Native 모듈 직접 접근 불가)
      if (window.NativeBridge) {
        console.log('📱 [nativeBridge] window.NativeBridge.scheduleNotification 호출');
        window.NativeBridge.scheduleNotification(title, body, delay, data);
      } else {
        console.error('❌ [nativeBridge] window.NativeBridge not available');
      }
    } else {
      // 웹에서는 setTimeout + 브라우저 알림 사용
      console.log('🌐 [nativeBridge] 웹 환경에서 setTimeout 사용');
      setTimeout(() => {
        this.showNotification(title, body, data);
      }, delay * 1000);
    }
  }

  // 푸시 알림 토큰 가져오기
  async getFCMToken(): Promise<string | null> {
    if (!this.isNativeApp()) {
      // 웹에서는 FCM 웹 푸시 사용
      return null;
    } else {
      return new Promise((resolve) => {
        this.once('FCM_TOKEN', (data) => resolve(data.token));
        // 앱이 시작될 때 자동으로 토큰이 전송됨
      });
    }
  }

  // 이벤트 리스너 등록
  on(eventType: string, callback: Function): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)?.push(callback);
  }

  // 일회성 이벤트 리스너
  once(eventType: string, callback: Function): void {
    const wrapper = (data: any) => {
      callback(data);
      this.off(eventType, wrapper);
    };
    this.on(eventType, wrapper);
  }

  // 이벤트 리스너 제거
  off(eventType: string, callback: Function): void {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // 네이티브 메시지 처리
  private handleNativeMessage(data: any): void {
    const callbacks = this.listeners.get(data.type);
    if (callbacks) {
      callbacks.forEach(callback => callback(data.data || data));
    }
  }

  // 딥링킹 처리
  handleDeepLink(url: string): void {
    // 딥링크 파싱 및 라우팅
    const route = this.parseDeepLink(url);
    if (route) {
      // React Router로 네비게이션
      window.location.href = route;
    }
  }

  private parseDeepLink(url: string): string | null {
    // honbabnono://meetup/123 -> /meetup/123
    const match = url.match(/honbabnono:\/\/(.+)/);
    if (match) {
      return `/${match[1]}`;
    }
    return null;
  }
}

// 싱글톤 인스턴스
const nativeBridge = new NativeBridgeHelper();

// 전역 객체로 노출 (디버깅용)
if (typeof window !== 'undefined') {
  (window as any).nativeBridge = nativeBridge;
}

export default nativeBridge;