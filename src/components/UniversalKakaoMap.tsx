import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { COLORS, SHADOWS } from '../styles/colors';
import { Icon } from './Icon';

interface UniversalKakaoMapProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelect: (location: {
    address: string;
    latitude: number;
    longitude: number;
    roadAddress?: string;
    placeName?: string;
  }) => void;
  initialLocation?: {
    latitude: number;
    longitude: number;
  };
}

const UniversalKakaoMap: React.FC<UniversalKakaoMapProps> = ({
  visible,
  onClose,
  onLocationSelect,
  initialLocation = { latitude: 37.5665, longitude: 126.9780 }
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useWebView, setUseWebView] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // 환경 감지
  useEffect(() => {
    const detectEnvironment = () => {
      // React Native 환경에서 WebView 사용 여부 결정
      if (Platform.OS === 'web') {
        // 웹 환경: 직접 카카오맵 SDK 사용
        console.log('🌐 웹 환경 감지: 직접 카카오맵 SDK 사용');
        setUseWebView(false);
      } else {
        // 모바일 환경: WebView 사용
        console.log('📱 모바일 환경 감지: WebView 방식 사용');
        setUseWebView(true);
      }
    };

    if (visible) {
      detectEnvironment();
    }
  }, [visible]);

  // 웹 환경용 카카오맵 직접 로딩
  const initializeWebKakaoMap = async () => {
    try {
      console.log('🗺️ 웹 카카오맵 초기화 시작...');
      setIsLoading(true);

      // 카카오맵 스크립트 로딩
      if (!window.kakao || !window.kakao.maps) {
        await loadKakaoScript();
      }

      if (!mapRef.current) {
        console.error('지도 컨테이너를 찾을 수 없습니다');
        return;
      }

      // 지도 생성
      const options = {
        center: new window.kakao.maps.LatLng(initialLocation.latitude, initialLocation.longitude),
        level: 3
      };

      const map = new window.kakao.maps.Map(mapRef.current, options);

      // 마커 생성
      const marker = new window.kakao.maps.Marker({
        position: options.center,
        draggable: true
      });
      marker.setMap(map);

      // 지오코더 생성
      const geocoder = new window.kakao.maps.services.Geocoder();

      // 주소 검색 함수
      const searchAddress = (lat: number, lng: number) => {
        geocoder.coord2Address(lng, lat, (result: any, status: any) => {
          if (status === window.kakao.maps.services.Status.OK) {
            const detailAddr = result[0];
            const roadAddress = detailAddr.road_address?.address_name || detailAddr.address.address_name;
            const jibunAddress = detailAddr.address.address_name;
            
            onLocationSelect({
              address: jibunAddress,
              roadAddress: roadAddress,
              latitude: lat,
              longitude: lng,
              placeName: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
            });
          }
        });
      };

      // 지도 클릭 이벤트
      window.kakao.maps.event.addListener(map, 'click', (mouseEvent: any) => {
        const latlng = mouseEvent.latLng;
        marker.setPosition(latlng);
        searchAddress(latlng.getLat(), latlng.getLng());
      });

      // 마커 드래그 이벤트
      window.kakao.maps.event.addListener(marker, 'dragend', () => {
        const position = marker.getPosition();
        searchAddress(position.getLat(), position.getLng());
      });

      // 초기 위치 설정
      searchAddress(initialLocation.latitude, initialLocation.longitude);

      setIsLoading(false);
      setError(null);
      console.log('✅ 웹 카카오맵 초기화 완료');

    } catch (error: any) {
      console.error('❌ 웹 카카오맵 초기화 실패:', error);
      setError(error.message);
      setIsLoading(false);
    }
  };

  // 카카오맵 스크립트 로딩
  const loadKakaoScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.kakao && window.kakao.maps) {
        resolve();
        return;
      }

      const existingScript = document.querySelector('script[src*="dapi.kakao.com"]');
      if (existingScript) {
        const checkKakao = setInterval(() => {
          if (window.kakao && window.kakao.maps) {
            clearInterval(checkKakao);
            resolve();
          }
        }, 100);
        return;
      }

      const script = document.createElement('script');
      script.async = true;
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.REACT_APP_KAKAO_JS_KEY || '9d1ee4bec9bd24d0ac9f8c9d68fbf432'}&libraries=services&autoload=true`;
      
      script.onload = () => {
        setTimeout(() => {
          if (window.kakao && window.kakao.maps && window.kakao.maps.LatLng) {
            resolve();
          } else {
            reject(new Error('카카오맵 SDK 로딩 실패'));
          }
        }, 500);
      };

      script.onerror = () => reject(new Error('카카오맵 스크립트 로딩 실패'));
      document.head.appendChild(script);
    });
  };

  // 모바일 WebView 메시지 처리
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('📱 WebView 메시지:', data);

      switch (data.type) {
        case 'MAP_READY':
          setIsLoading(false);
          setError(null);
          break;

        case 'MAP_ERROR':
          setError(data.error);
          setIsLoading(false);
          break;

        case 'LOCATION_SELECTED':
          onLocationSelect({
            address: data.data.address,
            latitude: data.data.latitude,
            longitude: data.data.longitude,
            roadAddress: data.data.address,
            placeName: data.data.placeName
          });
          onClose();
          break;
      }
    } catch (error) {
      console.error('WebView 메시지 파싱 오류:', error);
    }
  };

  // 웹 환경에서 컴포넌트 마운트 시 지도 초기화
  useEffect(() => {
    if (visible && !useWebView && Platform.OS === 'web') {
      // 웹 환경에서만 직접 카카오맵 초기화
      setTimeout(() => {
        initializeWebKakaoMap();
      }, 100);
    }
  }, [visible, useWebView]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="x" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {useWebView ? '위치 선택 (모바일)' : '위치 선택 (웹)'}
          </Text>
          <View style={styles.gpsButton} />
        </View>

        {/* 로딩 표시 */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingIcon}>🗺️</Text>
            <Text style={styles.loadingText}>
              {useWebView ? '모바일 지도를 불러오는 중...' : '웹 지도를 불러오는 중...'}
            </Text>
          </View>
        )}

        {/* 에러 표시 */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => {
                setError(null);
                setIsLoading(true);
                if (useWebView) {
                  webViewRef.current?.reload();
                } else {
                  initializeWebKakaoMap();
                }
              }}
            >
              <Text style={styles.retryButtonText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 지도 렌더링 */}
        {!error && (
          <>
            {useWebView ? (
              // 모바일: WebView 방식
              <WebView
                ref={webViewRef}
                source={{ uri: 'http://localhost:3000/kakao-map.html' }}
                style={styles.webview}
                onMessage={handleWebViewMessage}
                onError={() => setError('WebView 로딩 실패')}
                onLoadStart={() => setIsLoading(true)}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                allowsInlineMediaPlaybook={true}
                originWhitelist={['*']}
                mixedContentMode="compatibility"
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              // 웹: 직접 카카오맵 SDK 사용
              <View style={styles.webMapContainer}>
                <div
                  ref={mapRef}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 0,
                  }}
                />
              </View>
            )}
          </>
        )}

        {/* 안내 텍스트 */}
        {!error && !isLoading && (
          <View style={styles.instructionContainer}>
            <Text style={styles.instructionText}>
              📍 지도를 터치하거나 마커를 드래그하여 위치를 선택하세요
              {useWebView && ' (모바일 최적화)'}
            </Text>
          </View>
        )}
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
    paddingTop: Platform.OS === 'web' ? 12 : 50,
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
  gpsButton: {
    padding: 8,
    width: 40, // placeholder
  },
  webview: {
    flex: 1,
  },
  webMapContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  loadingIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
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
  instructionContainer: {
    backgroundColor: COLORS.secondary.light,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral.grey200,
  },
  instructionText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

// 타입 선언
declare global {
  interface Window {
    kakao: any;
  }
}

export default UniversalKakaoMap;