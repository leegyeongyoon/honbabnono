import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import { COLORS, SHADOWS } from '../styles/colors';
import { Icon } from './Icon';
import locationService from '../services/locationService';

interface LocationMapModalProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelect: (district: string, neighborhood: string, lat: number, lng: number) => void;
}

interface LocationInfo {
  district: string;
  neighborhood: string;
  description?: string;
}

// 서울시 주요 구/동 정보
const SEOUL_LOCATIONS: LocationInfo[] = [
  { district: '강남구', neighborhood: '역삼동', description: '강남역, IT기업 밀집지역' },
  { district: '강남구', neighborhood: '논현동', description: '학동역, 강남구청' },
  { district: '강남구', neighborhood: '삼성동', description: '삼성역, COEX' },
  { district: '강남구', neighborhood: '청담동', description: '청담역, 압구정로데오' },
  { district: '서초구', neighborhood: '서초동', description: '서초역, 법원단지' },
  { district: '서초구', neighborhood: '잠원동', description: '고속터미널, 반포한강공원' },
  { district: '서초구', neighborhood: '방배동', description: '사당역, 서울대입구역' },
  { district: '송파구', neighborhood: '잠실동', description: '잠실역, 롯데월드' },
  { district: '송파구', neighborhood: '문정동', description: '문정역, 가든파이브' },
  { district: '마포구', neighborhood: '홍대입구', description: '홍익대학교, 클럽가' },
  { district: '마포구', neighborhood: '상수동', description: '상수역, 카페거리' },
  { district: '마포구', neighborhood: '연남동', description: '연남동 카페거리' },
  { district: '마포구', neighborhood: '합정동', description: '합정역, 망원시장' },
  { district: '용산구', neighborhood: '한남동', description: '한남대교, 고급주거지역' },
  { district: '용산구', neighborhood: '이태원동', description: '이태원역, 외국인거리' },
  { district: '용산구', neighborhood: '용산동', description: '용산역, 전자상가' },
  { district: '종로구', neighborhood: '종로1가', description: '종각역, 광화문' },
  { district: '종로구', neighborhood: '인사동', description: '전통문화거리' },
  { district: '종로구', neighborhood: '명동', description: '명동역, 쇼핑거리' },
  { district: '중구', neighborhood: '을지로동', description: '을지로입구, 중구청' },
  { district: '중구', neighborhood: '장충동', description: '동대문역사문화공원' },
  { district: '영등포구', neighborhood: '여의도동', description: '여의도역, 금융가' },
  { district: '영등포구', neighborhood: '당산동', description: '당산역, 한강공원' },
  { district: '관악구', neighborhood: '신림동', description: '신림역, 서울대학교' },
  { district: '관악구', neighborhood: '봉천동', description: '사당역 인근' },
  { district: '동작구', neighborhood: '사당동', description: '사당역, 지하철 교차역' },
  { district: '동작구', neighborhood: '노량진동', description: '노량진역, 수산시장' },
];

// 서울시 구별 대표 색상
const DISTRICT_COLORS: { [key: string]: string } = {
  '강남구': '#FF6B6B',
  '서초구': '#4ECDC4', 
  '송파구': '#45B7D1',
  '마포구': '#96CEB4',
  '용산구': '#FFEAA7',
  '종로구': '#DDA0DD',
  '중구': '#98D8C8',
  '영등포구': '#F7DC6F',
  '관악구': '#BB8FCE',
  '동작구': '#85C1E9',
};

const LocationMapModal: React.FC<LocationMapModalProps> = ({
  visible,
  onClose,
  onLocationSelect,
}) => {
  const [selectedLocation, setSelectedLocation] = useState<LocationInfo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');

  // 검색 필터링된 위치 목록
  const filteredLocations = SEOUL_LOCATIONS.filter(location => {
    const searchTerm = searchQuery.toLowerCase();
    const districtMatch = selectedDistrict === '' || location.district === selectedDistrict;
    const textMatch = searchQuery === '' || 
      location.district.includes(searchTerm) ||
      location.neighborhood.includes(searchTerm) ||
      (location.description && location.description.includes(searchTerm));
    
    return districtMatch && textMatch;
  });

  // 구별 그룹핑
  const groupedByDistrict = filteredLocations.reduce((acc, location) => {
    if (!acc[location.district]) {
      acc[location.district] = [];
    }
    acc[location.district].push(location);
    return acc;
  }, {} as { [key: string]: LocationInfo[] });

  // 현재 위치 자동 감지 시도
  const handleAutoDetectLocation = async () => {
    try {
      // 개발 환경 감지
      const isDevelopment = process.env.NODE_ENV === 'development' || 
                            (typeof window !== 'undefined' && window.location && (
                              window.location.hostname === 'localhost' || 
                              window.location.hostname === '127.0.0.1'
                            ));

      const position = await locationService.getCurrentLocation();
      const address = await locationService.reverseGeocode(position.latitude, position.longitude);
      
      if (address) {
        const newLocation = {
          district: address.district,
          neighborhood: address.neighborhood,
          description: '현재 GPS 위치'
        };
        setSelectedLocation(newLocation);
        
        // 실제 좌표로 위치 선택
        onLocationSelect(
          address.district, 
          address.neighborhood, 
          position.latitude, 
          position.longitude
        );
        onClose();
      } else {
        Alert.alert('위치 오류', '현재 위치의 주소를 가져올 수 없습니다.\n아래 목록에서 수동으로 선택해주세요.');
      }
    } catch (error: any) {
      // 개발 환경에서는 조용한 로깅
      const isDevelopment = process.env.NODE_ENV === 'development' || 
                            (typeof window !== 'undefined' && window.location && (
                              window.location.hostname === 'localhost' || 
                              window.location.hostname === '127.0.0.1'
                            ));
      
      if (isDevelopment) {
        console.warn('📍 개발환경: GPS 자동감지 실패 (정상)', error.message);
      } else {
        console.error('GPS 자동 위치 감지 실패:', error);
      }

      // GPS 실패 시 Alert 대신 조용히 처리 
      // 사용자가 직접 클릭했을 때만 간단한 안내 제공
      console.warn('📍 GPS 자동감지 실패:', error.message);
    }
  };

  // 위치 선택 처리
  const handleLocationSelect = (location: LocationInfo) => {
    setSelectedLocation(location);
    
    // 기본 좌표값 (실제로는 각 동의 대표 좌표를 사용해야 함)
    const defaultCoordinates = {
      lat: 37.5665,
      lng: 126.978
    };
    
    onLocationSelect(
      location.district,
      location.neighborhood,
      defaultCoordinates.lat,
      defaultCoordinates.lng
    );
    onClose();
  };

  // 구 선택 처리
  const handleDistrictSelect = (district: string) => {
    if (selectedDistrict === district) {
      setSelectedDistrict(''); // 선택 해제
    } else {
      setSelectedDistrict(district);
    }
  };

  // 모달 닫기 처리
  const handleClose = () => {
    setSelectedLocation(null);
    setSearchQuery('');
    setSelectedDistrict('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Icon name="x" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🗺️ 위치 선택</Text>
          <TouchableOpacity onPress={handleAutoDetectLocation} style={styles.gpsButton}>
            <Icon name="navigation" size={24} color={COLORS.primary.main} />
          </TouchableOpacity>
        </View>

        {/* 검색 영역 */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Icon name="search" size={20} color={COLORS.text.secondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="구/동 이름이나 지역명 검색 (예: 강남, 홍대)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="x" size={20} color={COLORS.text.secondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* GPS 자동 감지 버튼 */}
        <View style={styles.autoDetectContainer}>
          <TouchableOpacity
            style={styles.autoDetectButton}
            onPress={handleAutoDetectLocation}
          >
            <Icon name="navigation" size={24} color={COLORS.primary.main} />
            <View style={styles.autoDetectText}>
              <Text style={styles.autoDetectTitle}>📍 현재 위치 자동 감지</Text>
              <Text style={styles.autoDetectSubtitle}>
                {typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) 
                  ? 'iOS에서는 제한적일 수 있어요. 아래 목록에서 선택하는 것을 추천해요!'
                  : 'GPS로 정확한 위치를 찾아드려요'
                }
              </Text>
            </View>
            <Icon name="chevron-right" size={20} color={COLORS.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* 구 선택 필터 */}
        <View style={styles.districtFilterContainer}>
          <Text style={styles.sectionTitle}>🏢 구별 선택</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.districtScroll}>
            <TouchableOpacity
              style={[
                styles.districtFilterButton,
                selectedDistrict === '' && styles.districtFilterButtonActive
              ]}
              onPress={() => setSelectedDistrict('')}
            >
              <Text style={[
                styles.districtFilterText,
                selectedDistrict === '' && styles.districtFilterTextActive
              ]}>전체</Text>
            </TouchableOpacity>
            {Object.keys(DISTRICT_COLORS).map((district) => (
              <TouchableOpacity
                key={district}
                style={[
                  styles.districtFilterButton,
                  { backgroundColor: selectedDistrict === district ? DISTRICT_COLORS[district] : 'white' },
                  selectedDistrict === district && styles.districtFilterButtonActive
                ]}
                onPress={() => handleDistrictSelect(district)}
              >
                <Text style={[
                  styles.districtFilterText,
                  selectedDistrict === district && styles.districtFilterTextActive
                ]}>{district}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 위치 목록 */}
        <ScrollView style={styles.locationList} showsVerticalScrollIndicator={false}>
          {Object.keys(groupedByDistrict).map((district) => (
            <View key={district} style={styles.districtGroup}>
              <View style={styles.districtHeader}>
                <View style={[
                  styles.districtColorBadge, 
                  { backgroundColor: DISTRICT_COLORS[district] || COLORS.primary.main }
                ]} />
                <Text style={styles.districtTitle}>{district}</Text>
                <Text style={styles.neighborhoodCount}>
                  {groupedByDistrict[district].length}개 동네
                </Text>
              </View>
              
              {groupedByDistrict[district].map((location, index) => (
                <TouchableOpacity
                  key={`${district}-${index}`}
                  style={styles.locationItem}
                  onPress={() => handleLocationSelect(location)}
                >
                  <View style={styles.locationInfo}>
                    <Text style={styles.neighborhoodName}>
                      📍 {location.neighborhood}
                    </Text>
                    {location.description && (
                      <Text style={styles.locationDescription}>
                        {location.description}
                      </Text>
                    )}
                  </View>
                  <Icon name="chevron-right" size={16} color={COLORS.text.secondary} />
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {filteredLocations.length === 0 && (
            <View style={styles.noResultsContainer}>
              <Icon name="map-pin" size={48} color={COLORS.text.secondary} />
              <Text style={styles.noResultsTitle}>검색 결과가 없습니다</Text>
              <Text style={styles.noResultsText}>
                다른 검색어를 입력하거나 전체 목록에서 선택해주세요
              </Text>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => {
                  setSearchQuery('');
                  setSelectedDistrict('');
                }}
              >
                <Text style={styles.resetButtonText}>전체 목록 보기</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
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
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  gpsButton: {
    padding: 4,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    ...SHADOWS.small,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text.primary,
    marginLeft: 8,
  },
  autoDetectContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  autoDetectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary.light,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.primary.main,
    ...SHADOWS.small,
  },
  autoDetectText: {
    flex: 1,
    marginLeft: 12,
  },
  autoDetectTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary.dark,
    marginBottom: 4,
  },
  autoDetectSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  districtFilterContainer: {
    backgroundColor: 'white',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  districtScroll: {
    paddingHorizontal: 16,
  },
  districtFilterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 10,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: COLORS.neutral.grey300,
  },
  districtFilterButtonActive: {
    borderColor: COLORS.primary.main,
  },
  districtFilterText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.secondary,
  },
  districtFilterTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  locationList: {
    flex: 1,
    padding: 16,
  },
  districtGroup: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  districtHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.neutral.grey50,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  districtColorBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  districtTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  neighborhoodCount: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
  },
  locationInfo: {
    flex: 1,
  },
  neighborhoodName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  locationDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    backgroundColor: 'white',
    borderRadius: 12,
    ...SHADOWS.small,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  resetButton: {
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default LocationMapModal;