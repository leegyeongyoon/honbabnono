import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { COLORS } from '../styles/colors';
import NativeMapModal from '../components/NativeMapModal';

const MapTestScreen = () => {
  console.log('🗺️ [MapTestScreen] 컴포넌트 렌더링됨');
  const [showMap, setShowMap] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);

  const handleLocationSelect = (district: string, neighborhood: string, lat: number, lng: number, address: string) => {
    setSelectedLocation({
      district,
      neighborhood,
      latitude: lat,
      longitude: lng,
      address
    });
    setShowMap(false);
    console.log('🗺️ [MapTest] 선택된 위치:', { district, neighborhood, lat, lng, address });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>카카오맵 테스트</Text>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={() => {
            console.log('🗺️ [MapTestScreen] 지도 열기 버튼 클릭됨');
            setShowMap(true);
            console.log('🗺️ [MapTestScreen] showMap 상태 변경됨:', true);
          }}
        >
          <Text style={styles.buttonText}>지도 열기</Text>
        </TouchableOpacity>

        {selectedLocation && (
          <View style={styles.locationInfo}>
            <Text style={styles.locationTitle}>선택된 위치:</Text>
            <Text style={styles.locationText}>{selectedLocation.district} {selectedLocation.neighborhood}</Text>
            <Text style={styles.locationText}>{selectedLocation.address}</Text>
            <Text style={styles.locationText}>
              위도: {selectedLocation.latitude}, 경도: {selectedLocation.longitude}
            </Text>
          </View>
        )}

        <NativeMapModal
          visible={showMap}
          onClose={() => setShowMap(false)}
          onLocationSelect={handleLocationSelect}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: COLORS.text.primary,
  },
  button: {
    backgroundColor: COLORS.primary.main,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  locationInfo: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: COLORS.text.primary,
  },
  locationText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 5,
  },
});

export default MapTestScreen;