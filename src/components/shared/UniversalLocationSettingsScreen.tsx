import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { COLORS, SHADOWS } from '../../styles/colors';
import { Icon } from '../Icon';
import { useUserStore } from '../../store/userStore';
import userApiService from '../../services/userApiService';
import KakaoMapModal from '../KakaoMapModal';
import NativeMapModal from '../NativeMapModal';

interface NavigationAdapter {
  navigate: (screen: string, params?: any) => void;
  goBack: () => void;
}

interface LocationData {
  district: string;
  neighborhood: string;
  lat?: number;
  lng?: number;
  address?: string;
}

interface UniversalLocationSettingsScreenProps {
  navigation: NavigationAdapter;
  user?: any;
  onLocationChange?: (location: LocationData) => void;
}

const UniversalLocationSettingsScreen: React.FC<UniversalLocationSettingsScreenProps> = ({
  navigation,
  user,
  onLocationChange,
}) => {
  const { neighborhood, updateNeighborhood } = useUserStore();
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  // GPS로 현재 위치 가져오기
  const getCurrentPosition = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (Platform.OS === 'web') {
        // 웹에서는 navigator.geolocation 사용
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              });
            },
            (error) => {
              console.error('웹 GPS 오류:', error);
              reject(error);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
          );
        } else {
          reject(new Error('Geolocation not supported'));
        }
      } else {
        // React Native에서는 Geolocation 사용
        Geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          },
          (error) => {
            console.error('Native GPS 오류:', error);
            reject(error);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      }
    });
  };

  // 카카오 API로 역지오코딩 (좌표 -> 주소)
  const reverseGeocode = async (lat: number, lng: number): Promise<LocationData | null> => {
    try {
      const kakaoApiKey = process.env.REACT_APP_KAKAO_MAP_API_KEY || '5a202bd90ab8dff01348f24cb1c37f3f';
      const response = await fetch(
        `https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x=${lng}&y=${lat}`,
        {
          headers: {
            Authorization: `KakaoAK ${kakaoApiKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('역지오코딩 API 호출 실패');
      }

      const data = await response.json();
      console.log('📍 역지오코딩 결과:', data);

      if (data.documents && data.documents.length > 0) {
        const doc = data.documents[0];
        return {
          district: doc.region_2depth_name || '강남구', // 구/군
          neighborhood: doc.region_3depth_name || '역삼동', // 동
          lat,
          lng,
          address: `${doc.region_1depth_name} ${doc.region_2depth_name} ${doc.region_3depth_name}`,
        };
      }

      return null;
    } catch (error) {
      console.error('역지오코딩 실패:', error);
      return null;
    }
  };

  // 내 주변 위치 가져오기
  const fetchMyLocation = async () => {
    try {
      setGpsLoading(true);
      console.log('📍 GPS로 현재 위치 가져오기...');

      const coords = await getCurrentPosition();
      console.log('📍 현재 좌표:', coords);

      const locationData = await reverseGeocode(coords.lat, coords.lng);
      if (locationData) {
        setCurrentLocation(locationData);
        updateNeighborhood(locationData.district, locationData.neighborhood);
        console.log('📍 현재 위치 설정 완료:', locationData);
      }
    } catch (error) {
      console.error('현재 위치 가져오기 실패:', error);
      // GPS 실패 시 알림 (선택사항)
      if (Platform.OS !== 'web') {
        Alert.alert(
          '위치 정보',
          '현재 위치를 가져올 수 없습니다. 위치 권한을 확인해주세요.',
          [{ text: '확인' }]
        );
      }
    } finally {
      setGpsLoading(false);
    }
  };

  // 저장된 지역 설정 불러오기 + 없으면 GPS로 가져오기
  const fetchLocationSettings = useCallback(async () => {
    try {
      setLoading(true);
      console.log('📍 지역 설정 조회 시작');

      let hasStoredLocation = false;

      // API에서 사용자 위치 설정 가져오기 시도
      try {
        const response = await userApiService.getProfile();
        if (response?.preferredDistrict && response?.preferredNeighborhood) {
          setCurrentLocation({
            district: response.preferredDistrict,
            neighborhood: response.preferredNeighborhood,
          });
          hasStoredLocation = true;
          console.log('📍 API에서 저장된 위치 사용:', response.preferredDistrict, response.preferredNeighborhood);
        }
      } catch (apiError) {
        console.log('API에서 위치 정보를 가져오지 못함');
      }

      // store에서 현재 설정된 동네 정보 가져오기
      if (!hasStoredLocation && neighborhood?.district && neighborhood?.neighborhood) {
        setCurrentLocation({
          district: neighborhood.district,
          neighborhood: neighborhood.neighborhood,
        });
        hasStoredLocation = true;
        console.log('📍 store에서 저장된 위치 사용:', neighborhood.district, neighborhood.neighborhood);
      }

      // 저장된 위치가 없으면 GPS로 현재 위치 가져오기
      if (!hasStoredLocation) {
        console.log('📍 저장된 위치 없음, GPS로 현재 위치 가져오기...');
        try {
          const coords = await getCurrentPosition();
          const locationData = await reverseGeocode(coords.lat, coords.lng);
          if (locationData) {
            setCurrentLocation(locationData);
            updateNeighborhood(locationData.district, locationData.neighborhood);
            console.log('📍 GPS 위치로 초기화:', locationData);
          } else {
            // GPS도 실패하면 기본값
            setCurrentLocation({
              district: '강남구',
              neighborhood: '역삼동',
            });
          }
        } catch (gpsError) {
          console.log('GPS 위치 가져오기 실패, 기본값 사용');
          setCurrentLocation({
            district: '강남구',
            neighborhood: '역삼동',
          });
        }
      }

    } catch (error) {
      console.error('지역 설정 조회 실패:', error);
      setCurrentLocation({
        district: '강남구',
        neighborhood: '역삼동',
      });
    } finally {
      setLoading(false);
    }
  }, [neighborhood, updateNeighborhood]);

  useEffect(() => {
    fetchLocationSettings();
  }, [fetchLocationSettings]);

  // 지도에서 위치 선택 처리
  const handleMapLocationSelect = async (
    district: string,
    neighborhood: string,
    lat: number,
    lng: number,
    address: string
  ) => {
    console.log('📍 지도에서 위치 선택됨:', { district, neighborhood, lat, lng, address });

    const newLocation: LocationData = {
      district,
      neighborhood,
      lat,
      lng,
      address,
    };

    setCurrentLocation(newLocation);
    setShowMapModal(false);

    // store 업데이트
    updateNeighborhood(district, neighborhood);

    // API로 저장 시도
    try {
      setSaving(true);
      await userApiService.updateProfile({
        preferredDistrict: district,
        preferredNeighborhood: neighborhood,
      });
      console.log('📍 지역 설정이 저장되었습니다');
    } catch (error) {
      console.error('지역 설정 저장 실패:', error);
    } finally {
      setSaving(false);
    }

    // 콜백 호출
    if (onLocationChange) {
      onLocationChange(newLocation);
    }
  };

  // 지도 모달 열기
  const handleOpenMap = () => {
    console.log('📍 지도 모달 열기');
    setShowMapModal(true);
  };

  // 로딩 상태
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.placeholder} />
          <Text style={styles.headerTitle}>지역 설정</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary.main} />
          <Text style={styles.loadingText}>지역 설정을 불러오는 중...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.placeholder} />
        <Text style={styles.headerTitle}>지역 설정</Text>
        <View style={styles.placeholder}>
          {saving && <ActivityIndicator size="small" color={COLORS.primary.main} />}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 현재 설정된 지역 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>현재 설정된 지역</Text>
          <View style={styles.currentLocationCard}>
            <View style={styles.locationIconContainer}>
              <Icon name="map-pin" size={24} color={COLORS.primary.main} />
            </View>
            <View style={styles.locationInfo}>
              {currentLocation ? (
                <>
                  <Text style={styles.locationMain}>
                    {currentLocation.district} {currentLocation.neighborhood}
                  </Text>
                  {currentLocation.address && (
                    <Text style={styles.locationAddress}>{currentLocation.address}</Text>
                  )}
                </>
              ) : (
                <Text style={styles.locationPlaceholder}>지역이 설정되지 않았습니다</Text>
              )}
            </View>
          </View>
        </View>

        {/* 지역 변경 버튼 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>지역 변경</Text>

          {/* 내 주변 위치로 설정 버튼 */}
          <TouchableOpacity
            style={styles.myLocationButton}
            onPress={fetchMyLocation}
            disabled={gpsLoading}
          >
            <View style={styles.myLocationIconContainer}>
              {gpsLoading ? (
                <ActivityIndicator size="small" color={COLORS.primary.main} />
              ) : (
                <Icon name="navigation" size={24} color={COLORS.primary.main} />
              )}
            </View>
            <View style={styles.buttonTextContainer}>
              <Text style={styles.myLocationTitle}>내 주변 위치로 설정</Text>
              <Text style={styles.myLocationSubtitle}>
                GPS로 현재 위치를 자동으로 가져옵니다
              </Text>
            </View>
            <Icon name="chevron-right" size={20} color={COLORS.primary.main} />
          </TouchableOpacity>

          {/* 지도에서 위치 선택 버튼 */}
          <TouchableOpacity style={styles.changeLocationButton} onPress={handleOpenMap}>
            <View style={styles.buttonIconContainer}>
              <Icon name="map" size={24} color={COLORS.neutral.white} />
            </View>
            <View style={styles.buttonTextContainer}>
              <Text style={styles.buttonTitle}>지도에서 위치 선택</Text>
              <Text style={styles.buttonSubtitle}>
                지도에서 직접 위치를 검색하고 선택할 수 있어요
              </Text>
            </View>
            <Icon name="chevron-right" size={20} color={COLORS.neutral.white} />
          </TouchableOpacity>
        </View>

        {/* 안내 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>지역 설정 안내</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoItem}>
              <Icon name="info" size={20} color={COLORS.primary.main} />
              <Text style={styles.infoText}>
                설정한 지역을 기준으로 주변 모임이 추천됩니다.
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Icon name="users" size={20} color={COLORS.primary.main} />
              <Text style={styles.infoText}>
                같은 지역의 사용자들과 더 쉽게 만날 수 있어요.
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Icon name="bell" size={20} color={COLORS.primary.main} />
              <Text style={styles.infoText}>
                설정 지역에 새로운 모임이 생기면 알림을 받을 수 있습니다.
              </Text>
            </View>
          </View>
        </View>

        {/* 인기 지역 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>인기 지역</Text>
          <View style={styles.popularLocationsContainer}>
            {[
              { district: '강남구', neighborhood: '역삼동', emoji: '🏙️' },
              { district: '마포구', neighborhood: '홍대', emoji: '🎸' },
              { district: '종로구', neighborhood: '종로', emoji: '🏛️' },
              { district: '서초구', neighborhood: '강남역', emoji: '🚇' },
            ].map((location, index) => (
              <TouchableOpacity
                key={index}
                style={styles.popularLocationItem}
                onPress={() => {
                  const newLocation = {
                    district: location.district,
                    neighborhood: location.neighborhood,
                  };
                  setCurrentLocation(newLocation);
                  updateNeighborhood(location.district, location.neighborhood);
                }}
              >
                <Text style={styles.popularLocationEmoji}>{location.emoji}</Text>
                <Text style={styles.popularLocationText}>
                  {location.district} {location.neighborhood}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* 플랫폼에 따른 지도 모달 */}
      {Platform.OS === 'web' ? (
        <KakaoMapModal
          visible={showMapModal}
          onClose={() => setShowMapModal(false)}
          onLocationSelect={handleMapLocationSelect}
        />
      ) : (
        <NativeMapModal
          visible={showMapModal}
          onClose={() => setShowMapModal(false)}
          onLocationSelect={handleMapLocationSelect}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.neutral.white,
    ...SHADOWS.small,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  placeholder: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    marginTop: 12,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.neutral.background,
  },
  currentLocationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.white,
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
    ...SHADOWS.small,
  },
  locationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  locationInfo: {
    flex: 1,
  },
  locationMain: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  locationPlaceholder: {
    fontSize: 16,
    color: COLORS.text.tertiary,
  },
  myLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.white,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.primary.main,
    ...SHADOWS.small,
  },
  myLocationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  myLocationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary.main,
    marginBottom: 4,
  },
  myLocationSubtitle: {
    fontSize: 13,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
  changeLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary.main,
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
    ...SHADOWS.medium,
  },
  buttonIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.neutral.white,
    marginBottom: 4,
  },
  buttonSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
  },
  infoCard: {
    backgroundColor: COLORS.neutral.white,
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
    ...SHADOWS.small,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  popularLocationsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
  },
  popularLocationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 4,
    marginBottom: 8,
    ...SHADOWS.small,
  },
  popularLocationEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  popularLocationText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
  bottomSpacer: {
    height: 40,
  },
});

export default UniversalLocationSettingsScreen;
