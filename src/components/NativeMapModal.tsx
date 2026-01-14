import React, { useState, useRef } from 'react';
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
import { COLORS, SHADOWS } from '../styles/colors';
import { Icon } from './Icon';

interface NativeMapModalProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelect: (district: string, neighborhood: string, lat: number, lng: number, address: string) => void;
}

const NativeMapModal: React.FC<NativeMapModalProps> = ({
  visible,
  onClose,
  onLocationSelect,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const webViewRef = useRef<WebView>(null);

  const handleMessage = (event: any) => {
    console.log('📱 WebView 원본 메시지:', event.nativeEvent.data);
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('📱 WebView 파싱된 메시지:', data);
      
      if (data.type === 'LOCATION_SELECTED') {
        const { address, latitude, longitude } = data.data;
        // 주소에서 구와 동 추출
        const addressParts = address.split(' ');
        const district = addressParts.find((part: string) => part.includes('구')) || '알 수 없음';
        const neighborhood = addressParts.find((part: string) => part.includes('동')) || '알 수 없음';
        
        onLocationSelect(district, neighborhood, latitude, longitude, address);
      } else if (data.type === 'CLOSE_MAP') {
        onClose();
      } else if (data.type === 'MAP_READY') {
        console.log('✅ 지도 준비 완료');
        setIsLoading(false);
      } else if (data.type === 'MAP_LOADING') {
        console.log('🔄 지도 로딩 중:', data.data);
      } else if (data.type === 'MAP_ERROR') {
        console.error('❌ 지도 에러:', data.data);
        setIsLoading(false);
      } else if (data.type === 'JS_ERROR') {
        console.error('❌ JavaScript 에러:', data.data);
      } else if (data.type === 'KAKAO_CHECK') {
        console.log('🗺️ 카카오 객체 상태:', data.status);
      }
    } catch (error) {
      console.error('WebView 메시지 파싱 오류:', error);
    }
  };

  const mapHTML = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <meta http-equiv="Content-Security-Policy" content="default-src * 'unsafe-inline' 'unsafe-eval' data: gap: content:">
    <title>지도 선택</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
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
            box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
            z-index: 1000;
        }
        .address-display {
            margin-bottom: 10px;
            padding: 10px;
            background: #f8f8f8;
            border-radius: 8px;
            font-size: 14px;
            color: #333;
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
            transition: all 0.2s;
        }
        .btn-primary {
            background: #FE6847;
            color: white;
        }
        .btn-secondary {
            background: #f0f0f0;
            color: #333;
        }
        .btn:active {
            transform: scale(0.98);
        }
        .loading {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            z-index: 1001;
        }
        .current-location-btn {
            position: absolute;
            right: 10px;
            bottom: 140px;
            width: 44px;
            height: 44px;
            background: white;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 999;
            font-size: 24px;
        }
        .current-location-btn:active {
            background: #f0f0f0;
        }
    </style>
</head>
<body>
    <div id="loading" class="loading">
        <div style="font-size: 48px;">🗺️</div>
        <p style="margin-top: 10px; color: #666;">지도를 불러오는 중...</p>
    </div>
    
    <div id="map"></div>
    
    <button class="current-location-btn" onclick="getCurrentLocation()">
        📍
    </button>
    
    <div class="control-panel">
        <div class="address-display" id="address">
            위치를 선택해주세요
        </div>
        <div class="button-group">
            <button class="btn btn-secondary" onclick="closeMap()">취소</button>
            <button class="btn btn-primary" onclick="selectLocation()">선택완료</button>
        </div>
    </div>

    <script>
        let map = null;
        let marker = null;
        let currentLocation = {
            lat: 37.5665,
            lng: 126.9780,
            address: '서울특별시 중구 태평로1가'
        };

        function sendMessage(type, data) {
            try {
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type, data }));
                } else {
                    console.log('WebView 메시지:', { type, data });
                }
            } catch (error) {
                console.error('메시지 전송 실패:', error);
            }
        }

        // Leaflet 지도 초기화
        function initializeMap() {
            try {
                sendMessage('MAP_LOADING', { status: 'initializing_map' });
                
                // Leaflet 지도 생성
                map = L.map('map').setView([currentLocation.lat, currentLocation.lng], 13);
                
                // OpenStreetMap 타일 레이어 추가
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors'
                }).addTo(map);
                
                // 마커 생성
                marker = L.marker([currentLocation.lat, currentLocation.lng], {
                    draggable: true
                }).addTo(map);
                
                // 지도 클릭 이벤트
                map.on('click', function(e) {
                    const { lat, lng } = e.latlng;
                    marker.setLatLng([lat, lng]);
                    currentLocation.lat = lat;
                    currentLocation.lng = lng;
                    searchAddress(lat, lng);
                });
                
                // 마커 드래그 이벤트
                marker.on('dragend', function(e) {
                    const { lat, lng } = e.target.getLatLng();
                    currentLocation.lat = lat;
                    currentLocation.lng = lng;
                    searchAddress(lat, lng);
                });
                
                // 초기 주소 검색
                searchAddress(currentLocation.lat, currentLocation.lng);
                
                document.getElementById('loading').style.display = 'none';
                sendMessage('MAP_READY', { status: 'ready' });
                
            } catch (error) {
                console.error('지도 초기화 실패:', error);
                sendMessage('MAP_ERROR', { error: error.message });
                document.getElementById('loading').innerHTML = '<div style="color: red; padding: 20px;">지도 초기화 실패: ' + error.message + '</div>';
            }
        }

        // 메인 초기화 함수
        function initialize() {
            sendMessage('MAP_LOADING', { status: 'starting' });
            
            // Leaflet 라이브러리 로드 확인
            let checkCount = 0;
            const maxChecks = 10;
            
            function checkLeaflet() {
                checkCount++;
                
                if (typeof L !== 'undefined') {
                    sendMessage('MAP_LOADING', { status: 'leaflet_ready' });
                    initializeMap();
                } else if (checkCount < maxChecks) {
                    sendMessage('MAP_LOADING', { status: 'waiting_leaflet', attempt: checkCount });
                    setTimeout(checkLeaflet, 500);
                } else {
                    sendMessage('MAP_ERROR', { error: 'Leaflet 라이브러리 로딩 실패' });
                    document.getElementById('loading').innerHTML = '<div style="color: red; padding: 20px;">지도 로딩 실패: 라이브러리 타임아웃</div>';
                }
            }
            
            checkLeaflet();
        }

        // 페이지 로드 시 초기화 실행
        window.addEventListener('load', initialize);

        // 주소 검색 (역지오코딩)
        function searchAddress(lat, lng) {
            // Nominatim API를 사용한 역지오코딩
            fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' + lng + '&addressdetails=1&accept-language=ko')
                .then(function(response) { return response.json(); })
                .then(function(data) {
                    if (data.display_name) {
                        currentLocation.address = data.display_name;
                        document.getElementById('address').textContent = data.display_name;
                    } else {
                        document.getElementById('address').textContent = '위치: ' + lat.toFixed(6) + ', ' + lng.toFixed(6);
                    }
                })
                .catch(function(error) {
                    console.error('주소 검색 실패:', error);
                    document.getElementById('address').textContent = '위치: ' + lat.toFixed(6) + ', ' + lng.toFixed(6);
                });
        }

        function getCurrentLocation() {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(function(position) {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    map.setView([lat, lng], 13);
                    marker.setLatLng([lat, lng]);
                    
                    currentLocation.lat = lat;
                    currentLocation.lng = lng;
                    searchAddress(lat, lng);
                }, function(error) {
                    alert('위치 정보를 가져올 수 없습니다.');
                });
            } else {
                alert('이 브라우저는 위치 정보를 지원하지 않습니다.');
            }
        }

        function selectLocation() {
            sendMessage('LOCATION_SELECTED', {
                latitude: currentLocation.lat,
                longitude: currentLocation.lng,
                address: currentLocation.address,
                roadAddress: currentLocation.address,
                placeName: currentLocation.address
            });
        }

        function closeMap() {
            sendMessage('CLOSE_MAP', {});
        }

        // 디버그용 로깅
        window.onerror = function(msg, url, lineNo, columnNo, error) {
            sendMessage('JS_ERROR', { 
                message: msg, 
                source: url, 
                lineno: lineNo, 
                colno: columnNo, 
                error: error ? error.stack : '' 
            });
            return false;
        };
    </script>
</body>
</html>
  `;

  console.log('🗺️ [NativeMapModal] 렌더링:', { visible, isLoading });
  
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
          <Text style={styles.headerTitle}>위치 선택</Text>
          <View style={styles.placeholder} />
        </View>

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary.main} />
            <Text style={styles.loadingText}>지도를 불러오는 중...</Text>
          </View>
        )}

        <WebView
          ref={webViewRef}
          source={{ 
            html: mapHTML,
            baseUrl: 'https://dapi.kakao.com'
          }}
          style={styles.webview}
          onMessage={handleMessage}
          onLoadStart={() => console.log('🌐 WebView 로딩 시작')}
          onLoadEnd={() => {
            console.log('🌐 WebView 로딩 완료');
            // 3초 후 카카오맵 객체 확인
            setTimeout(() => {
              webViewRef.current?.injectJavaScript(`
                console.log('WebView JavaScript 실행 중...');
                if (typeof kakao !== 'undefined') {
                  console.log('Kakao 객체 존재');
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'KAKAO_CHECK', status: 'exists' }));
                } else {
                  console.log('Kakao 객체 없음');
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'KAKAO_CHECK', status: 'missing' }));
                }
                true;
              `);
            }, 3000);
          }}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('🔴 WebView 에러:', nativeEvent);
          }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          originWhitelist={['*']}
          mixedContentMode="compatibility"
          allowsInlineMediaPlaybook={true}
          allowFileAccess={true}
          allowUniversalAccessFromFileURLs={true}
          cacheEnabled={false}
          incognito={false}
          thirdPartyCookiesEnabled={true}
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
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.text.secondary,
  },
});

export default NativeMapModal;