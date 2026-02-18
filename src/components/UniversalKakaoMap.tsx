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
  const webViewRef = useRef<WebView>(null);

  // WebView 메시지 처리
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('📱 WebView 메시지 수신:', data);

      switch (data.type) {
        case 'MAP_READY':
          setIsLoading(false);
          setError(null);
          // 초기 위치 설정
          const jsCode = `
            window.postMessage(JSON.stringify({
              type: 'SET_INITIAL_LOCATION',
              latitude: ${initialLocation.latitude},
              longitude: ${initialLocation.longitude}
            }), '*');
            true;
          `;
          webViewRef.current?.injectJavaScript(jsCode);
          break;

        case 'MAP_ERROR':
          setError(data.data.error);
          setIsLoading(false);
          break;

        case 'LOCATION_SELECTED':
          onLocationSelect({
            address: data.data.address,
            latitude: data.data.latitude,
            longitude: data.data.longitude,
            roadAddress: data.data.roadAddress,
            placeName: data.data.placeName
          });
          onClose();
          break;

        case 'CLOSE_MAP':
          onClose();
          break;
      }
    } catch (error) {
      console.error('WebView 메시지 파싱 오류:', error);
    }
  };

  // 인라인 HTML 생성
  const getKakaoMapHTML = () => {
    return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>카카오맵</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body, html { 
            width: 100%; 
            height: 100%; 
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        }
        #map { 
            width: 100%; 
            height: calc(100% - 120px); 
            position: relative;
        }
        .control-panel {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: white;
            padding: 15px;
            box-shadow: 0 -2px 10px rgba(13,13,12,0.08);
            z-index: 1000;
        }
        .address-display {
            margin-bottom: 10px;
            padding: 10px;
            background: #f8f8f8;
            border-radius: 8px;
            font-size: 14px;
            color: #1A1714;
            min-height: 45px;
            display: flex;
            align-items: center;
        }
        .button-group {
            display: flex;
            gap: 10px;
        }
        .btn {
            flex: 1;
            padding: 12px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
        }
        .btn-primary {
            background: #FE6847;
            color: white;
        }
        .btn-secondary {
            background: #f0f0f0;
            color: #1A1714;
        }
        .loading {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
        }
    </style>
</head>
<body>
    <div id="loading" class="loading">
        <div style="font-size: 48px;">🗺️</div>
        <p style="margin-top: 10px; color: #5C4F42;">지도를 불러오는 중...</p>
    </div>
    
    <div id="map"></div>
    
    <div class="control-panel">
        <div class="address-display" id="address">
            위치를 선택해주세요
        </div>
        <div class="button-group">
            <button class="btn btn-secondary" onclick="closeMap()">취소</button>
            <button class="btn btn-primary" onclick="selectLocation()">선택완료</button>
        </div>
    </div>

    <script type="text/javascript" src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=9d1ee4bec9bd24d0ac9f8c9d68fbf432&libraries=services"></script>
    <script>
        let map = null;
        let marker = null;
        let geocoder = null;
        let currentLocation = {
            lat: ${initialLocation.latitude},
            lng: ${initialLocation.longitude},
            address: '서울특별시 중구'
        };

        function sendMessage(type, data) {
            try {
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type, data }));
                }
            } catch (error) {
                console.error('메시지 전송 실패:', error);
            }
        }

        // 카카오맵 초기화 - autoload이므로 바로 실행
        window.onload = function() {
            // 카카오 객체 확인 및 지연 로딩
            function initializeKakaoMap() {
                if (typeof window.kakao !== 'undefined' && window.kakao.maps) {
                    try {
                        const container = document.getElementById('map');
                        if (!container) {
                            console.error('지도 컨테이너를 찾을 수 없습니다.');
                            return;
                        }

                        const options = {
                            center: new kakao.maps.LatLng(currentLocation.lat, currentLocation.lng),
                            level: 3
                        };

                        map = new kakao.maps.Map(container, options);

                        marker = new kakao.maps.Marker({
                            position: map.getCenter(),
                            draggable: true
                        });
                        marker.setMap(map);

                        geocoder = new kakao.maps.services.Geocoder();

                        kakao.maps.event.addListener(map, 'click', function(mouseEvent) {
                            const latlng = mouseEvent.latLng;
                            marker.setPosition(latlng);
                            currentLocation.lat = latlng.getLat();
                            currentLocation.lng = latlng.getLng();
                            searchAddress(currentLocation.lat, currentLocation.lng);
                        });

                        kakao.maps.event.addListener(marker, 'dragend', function() {
                            const position = marker.getPosition();
                            currentLocation.lat = position.getLat();
                            currentLocation.lng = position.getLng();
                            searchAddress(currentLocation.lat, currentLocation.lng);
                        });

                        searchAddress(currentLocation.lat, currentLocation.lng);
                        
                        document.getElementById('loading').style.display = 'none';
                        sendMessage('MAP_READY', { status: 'ready' });

                    } catch (error) {
                        console.error('지도 초기화 실패:', error);
                        document.getElementById('loading').innerHTML = '<div style="color: red; padding: 20px;">지도 초기화에 실패했습니다.<br>' + error.message + '</div>';
                        sendMessage('MAP_ERROR', { error: error.message });
                    }
                } else {
                    // 카카오 SDK가 아직 로드되지 않았으면 재시도
                    console.log('카카오 SDK 로딩 대기 중...');
                    setTimeout(initializeKakaoMap, 500);
                }
            }

            // 초기화 시작
            setTimeout(initializeKakaoMap, 100);
        };

        function searchAddress(lat, lng) {
            if (!geocoder) return;

            geocoder.coord2Address(lng, lat, function(result, status) {
                if (status === kakao.maps.services.Status.OK) {
                    const address = result[0].address.address_name;
                    const roadAddress = result[0].road_address ? result[0].road_address.address_name : address;
                    
                    currentLocation.address = address;
                    currentLocation.roadAddress = roadAddress;
                    
                    document.getElementById('address').textContent = roadAddress || address;
                }
            });
        }

        function selectLocation() {
            sendMessage('LOCATION_SELECTED', {
                latitude: currentLocation.lat,
                longitude: currentLocation.lng,
                address: currentLocation.address,
                roadAddress: currentLocation.roadAddress,
                placeName: currentLocation.address
            });
        }

        function closeMap() {
            sendMessage('CLOSE_MAP', {});
        }
    </script>
</body>
</html>
    `;
  };

  // WebView source 설정
  const getWebViewSource = () => {
    return { html: getKakaoMapHTML() };
  };

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
          <Text style={styles.headerTitle}>위치 선택</Text>
          <View style={styles.placeholder} />
        </View>

        {/* 로딩 표시 */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingIcon}>🗺️</Text>
            <Text style={styles.loadingText}>지도를 불러오는 중...</Text>
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
                webViewRef.current?.reload();
              }}
            >
              <Text style={styles.retryButtonText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* WebView로 카카오맵 표시 */}
        <WebView
          ref={webViewRef}
          source={getWebViewSource()}
          style={styles.webview}
          onMessage={handleWebViewMessage}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView 에러:', nativeEvent);
            setError(`지도 로딩 실패: ${nativeEvent.description || '네트워크 오류'}`);
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('HTTP 에러:', nativeEvent);
            setError(`서버 연결 실패 (${nativeEvent.statusCode})`);
          }}
          onLoadStart={() => {
            console.log('🔄 WebView 로딩 시작');
            setIsLoading(true);
          }}
          onLoadEnd={() => {
            console.log('✅ WebView 로딩 완료');
          }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsInlineMediaPlayback={true}
          originWhitelist={['*']}
          mixedContentMode="compatibility"
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          startInLoadingState={true}
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
  loadingContainer: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
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

export default UniversalKakaoMap;