import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { COLORS, SHADOWS } from '../styles/colors';

interface KakaoMapPickerProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelect: (location: {
    address: string;
    roadAddress: string;
    latitude: number;
    longitude: number;
    placeName?: string;
  }) => void;
  initialLocation?: {
    latitude: number;
    longitude: number;
  };
}

const KakaoMapPicker: React.FC<KakaoMapPickerProps> = ({
  visible,
  onClose,
  onLocationSelect,
  initialLocation = { latitude: 37.5665, longitude: 126.9780 } // 서울 시청 기본값
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);

  useEffect(() => {
    if (!visible || !mapRef.current) return;

    // 카카오맵 스크립트 로드
    const script = document.createElement('script');
    script.async = true;
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.REACT_APP_KAKAO_CLIENT_ID}&libraries=services&autoload=false`;
    
    script.onload = () => {
      window.kakao.maps.load(() => {
        const container = mapRef.current;
        const options = {
          center: new window.kakao.maps.LatLng(initialLocation.latitude, initialLocation.longitude),
          level: 3
        };

        const mapInstance = new window.kakao.maps.Map(container, options);
        
        // 마커 생성
        const markerInstance = new window.kakao.maps.Marker({
          position: new window.kakao.maps.LatLng(initialLocation.latitude, initialLocation.longitude),
          map: mapInstance
        });

        // 지도 클릭 이벤트
        window.kakao.maps.event.addListener(mapInstance, 'click', function(mouseEvent: any) {
          const latlng = mouseEvent.latLng;
          
          // 마커 위치 변경
          markerInstance.setPosition(latlng);
          
          // 주소 검색
          const geocoder = new window.kakao.maps.services.Geocoder();
          
          geocoder.coord2Address(latlng.getLng(), latlng.getLat(), (result: any, status: any) => {
            if (status === window.kakao.maps.services.Status.OK) {
              const detailAddr = result[0];
              
              setSelectedLocation({
                address: detailAddr.address.address_name,
                roadAddress: detailAddr.road_address?.address_name || detailAddr.address.address_name,
                latitude: latlng.getLat(),
                longitude: latlng.getLng()
              });
            }
          });
        });

        setMap(mapInstance);
        setMarker(markerInstance);
      });
    };

    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [visible, initialLocation]);

  const handleConfirm = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation);
      onClose();
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>장소 선택</Text>
          <Text style={styles.subtitle}>지도에서 원하는 위치를 클릭하세요</Text>
        </View>

        <View style={styles.mapContainer}>
          <div 
            ref={mapRef} 
            style={{ 
              width: '100%', 
              height: '100%',
              borderRadius: '12px',
            }}
          />
        </View>

        {selectedLocation && (
          <View style={styles.selectedLocationContainer}>
            <Text style={styles.selectedLocationTitle}>선택된 위치:</Text>
            <Text style={styles.selectedLocationText}>{selectedLocation.roadAddress}</Text>
            <Text style={styles.selectedLocationSubText}>{selectedLocation.address}</Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>취소</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.confirmButton, !selectedLocation && styles.disabledButton]} 
            onPress={handleConfirm}
            disabled={!selectedLocation}
          >
            <Text style={styles.confirmButtonText}>선택 완료</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.neutral.white,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  mapContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 12,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  selectedLocationContainer: {
    backgroundColor: COLORS.neutral.white,
    margin: 20,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    ...SHADOWS.small,
  },
  selectedLocationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  selectedLocationText: {
    fontSize: 16,
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  selectedLocationSubText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  confirmButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.primary.main,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  disabledButton: {
    backgroundColor: COLORS.neutral.grey200,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.white,
  },
});

// 카카오맵 타입 선언
declare global {
  interface Window {
    kakao: any;
  }
}

export default KakaoMapPicker;