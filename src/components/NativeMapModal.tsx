import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  ActivityIndicator,
} from 'react-native';
import WebView from 'react-native-webview';
import Geolocation from '@react-native-community/geolocation';
import { COLORS, SHADOWS } from '../styles/colors';
import { Icon } from './Icon';

interface NativeMapModalProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelect: (district: string, neighborhood: string, lat: number, lng: number, address: string, radius?: number) => void;
  mode?: 'search' | 'settings'; // search: 장소 검색, settings: 지역 설정
  initialRadius?: number; // 초기 반경 (km 단위)
}

const NativeMapModal: React.FC<NativeMapModalProps> = ({
  visible,
  onClose,
  onLocationSelect,
  mode = 'settings', // 기본값을 settings로 변경
  initialRadius, // 초기 반경 (km 단위)
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const webViewRef = useRef<WebView>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mapReadyRef = useRef(false);
  const gpsLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const prevVisibleRef = useRef(visible);

  // 디버그: visible 변경 추적
  useEffect(() => {
    if (prevVisibleRef.current !== visible) {
      console.log(`🔍 [NativeMapModal] visible 변경됨: ${prevVisibleRef.current} -> ${visible}`);
      prevVisibleRef.current = visible;
    }
  }, [visible]);

  // 타임아웃 클리어
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // GPS 위치 가져오기 함수
  const fetchGpsLocation = (retryCount = 0) => {
    console.log('📍 [NativeMapModal] React Native GPS 위치 가져오기 시작... (시도:', retryCount + 1, ')');
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log('📍 [NativeMapModal] React Native GPS 성공:', latitude, longitude);
        gpsLocationRef.current = { lat: latitude, lng: longitude };

        // 이미 지도가 준비되어 있으면 바로 좌표 전송
        if (mapReadyRef.current && webViewRef.current) {
          sendGpsToWebView(latitude, longitude);
        }
      },
      (error) => {
        console.log('📍 [NativeMapModal] React Native GPS 실패:', error.code, error.message);
        // 재시도 (최대 2번)
        if (retryCount < 2) {
          console.log('📍 [NativeMapModal] GPS 재시도 중...');
          setTimeout(() => fetchGpsLocation(retryCount + 1), 1000);
        }
      },
      {
        enableHighAccuracy: retryCount === 0, // 첫 시도만 고정밀도, 실패 시 낮은 정밀도로 재시도
        timeout: 20000,
        maximumAge: 60000
      }
    );
  };

  // visible 변경 시 상태 초기화 및 GPS 위치 가져오기
  useEffect(() => {
    if (visible) {
      setIsLoading(true);
      setError(null);
      mapReadyRef.current = false;
      gpsLocationRef.current = null;

      // iOS에서는 먼저 위치 권한 요청 (필수)
      if (Platform.OS === 'ios') {
        console.log('📍 [NativeMapModal] iOS 위치 권한 요청...');
        // setRNConfiguration으로 권한 레벨 설정
        Geolocation.setRNConfiguration({
          skipPermissionRequests: false,
          authorizationLevel: 'whenInUse',
        });
        // requestAuthorization은 동기식 - 콜백 없음
        Geolocation.requestAuthorization();
        // 잠시 대기 후 위치 가져오기
        setTimeout(() => fetchGpsLocation(), 500);
      } else {
        // Android에서는 바로 위치 가져오기
        fetchGpsLocation();
      }
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [visible]);

  // GPS 좌표를 WebView에 전송
  const sendGpsToWebView = (lat: number, lng: number) => {
    if (webViewRef.current) {
      const script = `
        if (typeof setLocationFromNative === 'function') {
          setLocationFromNative(${lat}, ${lng});
          console.log('📍 React Native에서 좌표 수신:', ${lat}, ${lng});
        }
        true;
      `;
      webViewRef.current.injectJavaScript(script);
      console.log('📍 [NativeMapModal] WebView에 GPS 좌표 전송:', lat, lng);
    }
  };

  // 초기 반경을 WebView에 전송
  const sendInitialRadiusToWebView = (radiusKm: number) => {
    if (webViewRef.current) {
      const script = `
        if (typeof setInitialRadiusFromNative === 'function') {
          setInitialRadiusFromNative(${radiusKm});
          console.log('📍 React Native에서 초기 반경 수신:', ${radiusKm}, 'km');
        }
        true;
      `;
      webViewRef.current.injectJavaScript(script);
      console.log('📍 [NativeMapModal] WebView에 초기 반경 전송:', radiusKm, 'km');
    }
  };

  // 서버 URL - visible이 true가 될 때만 새 URL 생성 (무한 루프 방지)
  const mapUrl = useMemo(() => {
    if (!visible) {return '';}
    const cacheBuster = Date.now();
    // mode에 따라 다른 HTML 파일 로드
    const htmlFile = mode === 'settings' ? 'location-settings.html' : 'kakao-map.html';
    if (__DEV__) {
      const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
      return `http://${host}:3000/${htmlFile}?v=${cacheBuster}`;
    }
    return `https://eattable.kr/${htmlFile}`;
  }, [visible, mode]);

  const handleMessage = (event: any) => {
    console.log('📱 WebView 원본 메시지:', event.nativeEvent.data);
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('📱 WebView 파싱된 메시지:', data);

      if (data.type === 'LOCATION_SELECTED') {
        const { address, latitude, longitude, district, neighborhood, radius } = data.data;
        console.log('📍 위치 선택됨:', { address, latitude, longitude, district, neighborhood, radius });
        console.log('🔍 [NativeMapModal] LOCATION_SELECTED 처리 - onLocationSelect 호출 예정');
        // onLocationSelect 콜백에서 모달 닫기를 처리하므로 여기서는 onClose 호출하지 않음
        onLocationSelect(district || '알 수 없음', neighborhood || '알 수 없음', latitude, longitude, address, radius);
      } else if (data.type === 'CLOSE_MAP') {
        console.log('🔍 [NativeMapModal] CLOSE_MAP 처리 - onClose 호출 예정');
        onClose();
      } else if (data.type === 'MAP_READY') {
        console.log('✅ 카카오 지도 준비 완료');
        mapReadyRef.current = true;
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setIsLoading(false);
        setError(null);

        // GPS 좌표가 이미 있으면 WebView로 전송
        if (gpsLocationRef.current) {
          sendGpsToWebView(gpsLocationRef.current.lat, gpsLocationRef.current.lng);
        }

        // 초기 반경이 있으면 WebView로 전송
        if (initialRadius) {
          console.log('📍 [NativeMapModal] 초기 반경 전송:', initialRadius, 'km');
          sendInitialRadiusToWebView(initialRadius);
        }
      } else if (data.type === 'MAP_LOADING') {
        console.log('🔄 지도 로딩 중:', data.data);
      } else if (data.type === 'MAP_ERROR') {
        console.error('❌ 지도 에러:', data.data);
        const errorMsg = data.data?.error || '지도 로딩 실패';
        setError(`${errorMsg}\n\n(URL: ${mapUrl})`);
        setIsLoading(false);
      } else if (data.type === 'JS_ERROR') {
        console.error('❌ JavaScript 에러:', data.data);
      } else if (data.type === 'GPS_LOCATION') {
        console.log('📍 GPS 위치:', data.data);
      }
    } catch (err) {
      console.error('WebView 메시지 파싱 오류:', err);
    }
  };

  if (!visible) {
    console.log('🗺️ [NativeMapModal] visible=false이므로 렌더링하지 않음');
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="x" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{mode === 'settings' ? '지역 설정' : '위치 선택'}</Text>
          <View style={styles.placeholder} />
        </View>

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary.main} />
            <Text style={styles.loadingText}>카카오 지도를 불러오는 중...</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setError(null);
                setIsLoading(true);
                webViewRef.current?.reload();
              }}
            >
              <Text style={styles.retryButtonText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        )}

        <WebView
          ref={webViewRef}
          source={{ uri: mapUrl }}
          style={[styles.webview, (isLoading || error) && styles.hidden]}
          onMessage={handleMessage}
          onLoadStart={() => {
            console.log('🌐 WebView 로딩 시작:', mapUrl);
            setIsLoading(true);
          }}
          onLoadEnd={() => {
            console.log('🌐 WebView 로딩 완료');
            // 10초 후에도 MAP_READY가 오지 않으면 타임아웃 처리
            if (!mapReadyRef.current && !timeoutRef.current) {
              timeoutRef.current = setTimeout(() => {
                if (!mapReadyRef.current) {
                  console.warn('⚠️ 지도 초기화 타임아웃');
                  setError('지도 로딩 시간이 초과되었습니다.\n네트워크 연결을 확인해주세요.');
                  setIsLoading(false);
                }
              }, 10000);
            }
          }}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('🔴 WebView 에러:', nativeEvent);
            setError('지도 로딩 실패: ' + (nativeEvent.description || '네트워크 오류'));
            setIsLoading(false);
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('🔴 HTTP 에러:', nativeEvent);
            setError(`서버 연결 실패 (${nativeEvent.statusCode})`);
            setIsLoading(false);
          }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          originWhitelist={['*']}
          mixedContentMode="always"
          allowsInlineMediaPlayback={true}
          allowFileAccess={true}
          allowUniversalAccessFromFileURLs={true}
          geolocationEnabled={true}
          mediaPlaybackRequiresUserAction={false}
          bounces={false}
          scrollEnabled={false}
          cacheEnabled={false}
          incognito={true}
          userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
          sharedCookiesEnabled={true}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
    ...SHADOWS.small,
  },
  closeButton: {
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
  webview: {
    flex: 1,
  },
  hidden: {
    opacity: 0,
    height: 0,
  },
  loadingContainer: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 200,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: COLORS.primary.main,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    ...SHADOWS.small,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NativeMapModal;
