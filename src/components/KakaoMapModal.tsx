import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { COLORS, SHADOWS } from '../styles/colors';
import { Icon } from './Icon';
import locationService from '../services/locationService';

interface KakaoMapModalProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelect: (district: string, neighborhood: string, lat: number, lng: number, address: string) => void;
}

declare global {
  interface Window {
    kakao: any;
  }
}

const KakaoMapModal: React.FC<KakaoMapModalProps> = ({
  visible,
  onClose,
  onLocationSelect,
}) => {
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [currentAddress, setCurrentAddress] = useState<string>('위치를 선택해주세요');
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
    district: string;
    neighborhood: string;
    address: string;
  } | null>(null);
  
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const geocoderRef = useRef<any>(null);

  // 카카오 지도 스크립트 로딩
  useEffect(() => {
    if (!visible) return;

    const loadKakaoMap = () => {
      // 이미 로드된 경우
      if (window.kakao && window.kakao.maps) {
        initializeMap();
        return;
      }

      // 스크립트가 이미 추가되어 있는지 확인
      const existingScript = document.getElementById('kakao-map-script');
      if (existingScript) {
        existingScript.addEventListener('load', () => {
          if (window.kakao && window.kakao.maps) {
            window.kakao.maps.load(initializeMap);
          }
        });
        return;
      }

      // 카카오 지도 API 스크립트 추가
      const script = document.createElement('script');
      script.id = 'kakao-map-script';
      // 카카오 개발자에서 발급받은 JavaScript 키 사용
      const KAKAO_MAP_KEY = process.env.REACT_APP_KAKAO_CLIENT_ID || '5a202bd90ab8dff01348f24cb1c37f3f';
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_KEY}&libraries=services&autoload=false`;
      script.async = true;
      script.onload = () => {
        if (window.kakao && window.kakao.maps) {
          window.kakao.maps.load(initializeMap);
        }
      };
      script.onerror = () => {
        console.error('카카오 지도 스크립트 로딩 실패');
        setIsMapLoading(false);
        Alert.alert('지도 로딩 실패', '인터넷 연결을 확인하거나 잠시 후 다시 시도해주세요.');
      };
      document.head.appendChild(script);
    };

    loadKakaoMap();
  }, [visible]);

  // 지도 초기화
  const initializeMap = async () => {
    try {
      if (!mapContainerRef.current || !window.kakao) {
        throw new Error('지도 컨테이너 또는 카카오 객체를 찾을 수 없습니다.');
      }

      setIsMapLoading(true);

      // 지오코더 생성
      geocoderRef.current = new window.kakao.maps.services.Geocoder();

      // 현재 위치 가져오기 시도
      let initialPosition = { lat: 37.5665, lng: 126.978 }; // 서울시청 기본 위치
      
      // GPS 위치 감지를 더 적극적으로 시도
      let gpsAttempt = 0;
      const maxGpsAttempts = 2;
      
      while (gpsAttempt < maxGpsAttempts) {
        try {
          console.log(`📍 GPS 위치 감지 시도 (${gpsAttempt + 1}/${maxGpsAttempts})...`);
          
          // GPS 권한 먼저 확인
          const permissionStatus = await locationService.checkLocationPermission();
          console.log('📍 GPS 권한 상태:', permissionStatus);
          
          if (permissionStatus === 'denied') {
            console.warn('📍 GPS 권한 거부됨');
            throw new Error('GPS 권한이 거부되었습니다.');
          }
          
          const position = await locationService.getCurrentLocation();
          initialPosition = {
            lat: position.latitude,
            lng: position.longitude
          };
          console.log('✅ GPS 위치 감지 성공:', initialPosition);
          
          // 현재 위치의 주소 가져오기
          await updateAddressFromCoords(initialPosition.lat, initialPosition.lng);
          break; // 성공하면 루프 종료
          
        } catch (error: any) {
          gpsAttempt++;
          console.warn(`📍 GPS 시도 ${gpsAttempt} 실패:`, error.message);
          
          // 마지막 시도였다면 기본 위치 사용
          if (gpsAttempt >= maxGpsAttempts) {
            console.warn('📍 GPS 최대 시도 횟수 초과, 기본 위치 사용');
            
            // GPS 실패 시 사용자에게 안내
            if (error.message?.includes('권한') || error.message?.includes('denied')) {
              setCurrentAddress('📍 위치 권한을 허용하면 현재 위치를 자동으로 찾을 수 있습니다');
            } else {
              setCurrentAddress('📍 GPS 신호가 약해 기본 위치(서울시청)로 설정했습니다');
            }
          } else {
            // 재시도 전 잠시 대기
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      // 지도 생성
      const options = {
        center: new window.kakao.maps.LatLng(initialPosition.lat, initialPosition.lng),
        level: 3 // 확대 레벨
      };

      const map = new window.kakao.maps.Map(mapContainerRef.current, options);
      mapRef.current = map;

      // 마커 생성
      const markerPosition = new window.kakao.maps.LatLng(initialPosition.lat, initialPosition.lng);
      const marker = new window.kakao.maps.Marker({
        position: markerPosition,
        draggable: true
      });
      marker.setMap(map);
      markerRef.current = marker;

      // 지도 클릭 이벤트
      window.kakao.maps.event.addListener(map, 'click', function(mouseEvent: any) {
        const latlng = mouseEvent.latLng;
        const lat = latlng.getLat();
        const lng = latlng.getLng();
        
        // 마커 위치 이동
        marker.setPosition(latlng);
        updateAddressFromCoords(lat, lng);
      });

      // 마커 드래그 이벤트
      window.kakao.maps.event.addListener(marker, 'dragend', function() {
        const position = marker.getPosition();
        const lat = position.getLat();
        const lng = position.getLng();
        updateAddressFromCoords(lat, lng);
      });

      setIsMapLoading(false);
      console.log('✅ 카카오 지도 초기화 완료');
    } catch (error) {
      console.error('❌ 지도 초기화 실패:', error);
      setIsMapLoading(false);
      Alert.alert('지도 오류', '지도를 불러올 수 없습니다.\n페이지를 새로고침하거나 잠시 후 다시 시도해주세요.');
    }
  };

  // 좌표로 주소 검색
  const updateAddressFromCoords = async (lat: number, lng: number) => {
    try {
      if (!geocoderRef.current) {
        throw new Error('지오코더가 초기화되지 않았습니다.');
      }

      const coord = new window.kakao.maps.LatLng(lat, lng);
      
      geocoderRef.current.coord2Address(coord.getLng(), coord.getLat(), (result: any, status: any) => {
        if (status === window.kakao.maps.services.Status.OK) {
          const address = result[0];
          const roadAddress = address.road_address;
          const jibunAddress = address.address;
          
          // 도로명 주소 우선, 없으면 지번 주소 사용
          const fullAddress = roadAddress ? roadAddress.address_name : jibunAddress.address_name;
          const district = jibunAddress.region_2depth_name; // 구
          const neighborhood = jibunAddress.region_3depth_name; // 동
          
          console.log('📍 주소 변환 완료:', { fullAddress, district, neighborhood });
          
          setCurrentAddress(fullAddress);
          setSelectedLocation({
            lat,
            lng,
            district,
            neighborhood,
            address: fullAddress
          });
        } else {
          console.warn('주소 변환 실패:', status);
          setCurrentAddress('주소를 찾을 수 없습니다');
        }
      });
    } catch (error) {
      console.error('주소 검색 실패:', error);
      setCurrentAddress('주소 검색에 실패했습니다');
    }
  };

  // 현재 위치로 이동 (더 적극적인 GPS 시도)
  const moveToCurrentLocation = async () => {
    try {
      console.log('📍 GPS로 현재 위치 이동 시도...');
      
      // GPS 권한 먼저 확인
      const permissionStatus = await locationService.checkLocationPermission();
      console.log('📍 GPS 권한 상태:', permissionStatus);
      
      if (permissionStatus === 'denied') {
        Alert.alert(
          'GPS 권한 필요', 
          '📱 위치 권한 설정 방법:\n\n1️⃣ 브라우저 주소창 왼쪽 🔒 클릭\n2️⃣ 위치 → "허용" 선택\n3️⃣ 페이지 새로고침\n\niOS의 경우:\n• 설정 → Safari → 위치 → 허용\n• 설정 → 개인정보보호 → 위치서비스 → 켜기',
          [
            { text: '설정 방법 보기', onPress: () => {
              const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
              const message = isIOS 
                ? 'iOS 설정:\n\n1️⃣ 설정 → 개인정보보호 → 위치서비스 → 켜기\n2️⃣ 설정 → Safari → 웹사이트용 → 위치 → 허용\n3️⃣ Safari 완전 종료 후 재시작\n4️⃣ https://honbabnono.com 재접속'
                : '브라우저 설정:\n\n1️⃣ 주소창 왼쪽 🔒 아이콘 클릭\n2️⃣ 위치 → "허용" 선택\n3️⃣ 페이지 새로고침';
              Alert.alert('GPS 설정 방법', message);
            }},
            { text: '지도에서 직접 선택', style: 'cancel' }
          ]
        );
        return;
      }
      
      // 여러 번 시도
      let success = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`📍 GPS 시도 ${attempt}/3...`);
          const position = await locationService.getCurrentLocation();
          const newPosition = {
            lat: position.latitude,
            lng: position.longitude
          };

          if (mapRef.current && markerRef.current) {
            const kakaoPosition = new window.kakao.maps.LatLng(newPosition.lat, newPosition.lng);
            mapRef.current.setCenter(kakaoPosition);
            markerRef.current.setPosition(kakaoPosition);
            await updateAddressFromCoords(newPosition.lat, newPosition.lng);
            console.log('✅ 현재 위치 이동 완료:', newPosition);
            success = true;
            break;
          }
        } catch (attemptError: any) {
          console.warn(`📍 GPS 시도 ${attempt} 실패:`, attemptError.message);
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 대기
          }
        }
      }
      
      if (!success) {
        throw new Error('GPS 3회 시도 모두 실패');
      }
      
    } catch (error: any) {
      console.error('현재 위치 이동 실패:', error);
      
      let title = 'GPS 오류';
      let message = '현재 위치를 가져올 수 없습니다.';
      
      // 에러 타입별 안내
      if (error.message?.includes('권한')) {
        title = 'GPS 권한 필요';
        message = 'GPS 권한을 허용해주세요.\n\n📱 설정 → 개인정보보호 → 위치서비스\n🌐 브라우저 → 주소창 🔒 → 위치 허용';
      } else if (error.message?.includes('시간') || error.message?.includes('timeout')) {
        title = '📡 GPS 신호 약함';
        message = '• 실외로 이동해서 재시도\n• WiFi 연결 확인\n• 잠시 후 다시 시도';
      } else {
        title = '📍 위치 감지 실패';
        message = '• 실외에서 시도해보세요\n• WiFi/데이터 연결 확인\n• 지도에서 직접 선택하셔도 됩니다';
      }
      
      Alert.alert(title, message, [
        { text: '지도에서 선택', style: 'cancel' },
        { text: '다시 시도', onPress: moveToCurrentLocation }
      ]);
    }
  };

  // 위치 선택 확인
  const handleLocationConfirm = () => {
    if (selectedLocation) {
      console.log('✅ 위치 선택 확정:', selectedLocation);
      onLocationSelect(
        selectedLocation.district,
        selectedLocation.neighborhood,
        selectedLocation.lat,
        selectedLocation.lng,
        selectedLocation.address
      );
      handleClose();
    } else {
      Alert.alert('위치 선택', '지도에서 위치를 선택해주세요.');
    }
  };

  // 모달 닫기
  const handleClose = () => {
    setSelectedLocation(null);
    setCurrentAddress('위치를 선택해주세요');
    setIsMapLoading(true);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Icon name="x" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>내 동네 설정</Text>
          <TouchableOpacity onPress={moveToCurrentLocation} style={styles.gpsButton}>
            <Icon name="navigation" size={24} color={COLORS.primary.main} />
          </TouchableOpacity>
        </View>

        {/* 지도 컨테이너 */}
        <View style={styles.mapContainer}>
          {isMapLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary.main} />
              <Text style={styles.loadingText}>지도를 불러오는 중...</Text>
            </View>
          )}
          
          <div
            ref={mapContainerRef}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: 0,
            }}
          />

          {/* 중앙 십자선 - 선택적으로 추가 */}
          {!isMapLoading && (
            <View style={styles.centerCrosshair}>
              <View style={styles.crosshairLine} />
              <View style={[styles.crosshairLine, styles.crosshairVertical]} />
            </View>
          )}
        </View>

        {/* 선택된 주소 정보 */}
        <View style={styles.addressContainer}>
          <View style={styles.addressHeader}>
            <Icon name="map-pin" size={20} color={COLORS.primary.main} />
            <Text style={styles.addressLabel}>선택된 위치</Text>
          </View>
          <Text style={styles.addressText}>{currentAddress}</Text>
        </View>

        {/* 안내 메시지 */}
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>
            📍 지도를 터치하거나 마커를 드래그하여 정확한 위치를 선택하세요
          </Text>
        </View>

        {/* 확인 버튼 */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.confirmButton,
              !selectedLocation && styles.confirmButtonDisabled
            ]}
            onPress={handleLocationConfirm}
            disabled={!selectedLocation}
          >
            <Text style={[
              styles.confirmButtonText,
              !selectedLocation && styles.confirmButtonTextDisabled
            ]}>
              이 위치로 설정
            </Text>
          </TouchableOpacity>
        </View>
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
    paddingTop: 50, // 상태바 영역 고려
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
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
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  centerCrosshair: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -10,
    marginLeft: -10,
    pointerEvents: 'none',
  },
  crosshairLine: {
    width: 20,
    height: 2,
    backgroundColor: COLORS.primary.main,
    position: 'absolute',
  },
  crosshairVertical: {
    width: 2,
    height: 20,
    top: -9,
    left: 9,
  },
  addressContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral.grey200,
    ...SHADOWS.small,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginLeft: 8,
  },
  addressText: {
    fontSize: 16,
    color: COLORS.text.primary,
    lineHeight: 22,
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
  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 34, // 홈 인디케이터 영역 고려
    backgroundColor: 'white',
  },
  confirmButton: {
    backgroundColor: COLORS.primary.main,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  confirmButtonDisabled: {
    backgroundColor: COLORS.neutral.grey300,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  confirmButtonTextDisabled: {
    color: COLORS.text.secondary,
  },
});

export default KakaoMapModal;