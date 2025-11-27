import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { COLORS, SHADOWS } from '../styles/colors';
import { Icon } from './Icon';
import locationService from '../services/locationService';
import KakaoMapModal from './KakaoMapModal';

interface NeighborhoodSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (district: string, neighborhood: string) => void;
  currentNeighborhood?: { district: string; neighborhood: string } | null;
}

interface SearchResult {
  latitude: number;
  longitude: number;
  district: string;
  neighborhood: string;
  fullAddress: string;
}

const NeighborhoodSelector: React.FC<NeighborhoodSelectorProps> = ({
  visible,
  onClose,
  onSelect,
  currentNeighborhood,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'popular' | 'search'>('popular');
  const [showMapModal, setShowMapModal] = useState(false);

  const popularNeighborhoods = locationService.getPopularNeighborhoods();

  // 카카오 지도 모달 열기
  const handleOpenKakaoMap = () => {
    setShowMapModal(true);
  };

  // 카카오 지도에서 위치 선택 처리 (GPS 권한 체크 포함)
  const handleKakaoMapLocationSelect = (district: string, neighborhood: string, lat: number, lng: number, address: string) => {
    console.log('🗺️ 카카오 지도에서 위치 선택됨:', { district, neighborhood, lat, lng, address });
    onSelect(district, neighborhood);
    setShowMapModal(false);
    onClose();
  };

  // 현재 위치 가져오기 (기존 GPS 기능)
  const handleGetCurrentLocation = async () => {
    try {
      setLoading(true);
      
      // 위치 권한 확인
      const permissionState = await locationService.checkLocationPermission();
      if (permissionState === 'denied') {
        Alert.alert(
          '위치 권한이 차단됨',
          '위치 권한이 차단되어 있습니다.\n\n📍 해결방법:\n1. 브라우저 주소창 왼쪽 🔒 아이콘 클릭\n2. 위치 설정을 "허용"으로 변경\n3. 페이지 새로고침 후 다시 시도',
          [
            {
              text: '인기 동네 보기',
              onPress: () => setActiveTab('popular')
            },
            {
              text: '직접 검색',
              onPress: () => setActiveTab('search')
            },
            {
              text: '페이지 새로고침',
              onPress: () => {
                if (typeof window !== 'undefined') {
                  window.location.reload();
                }
              }
            }
          ]
        );
        return;
      }

      const currentLocation = await locationService.getCurrentLocation();
      const address = await locationService.reverseGeocode(
        currentLocation.latitude,
        currentLocation.longitude
      );

      if (address) {
        onSelect(address.district, address.neighborhood);
        onClose();
      } else {
        Alert.alert('오류', '현재 위치의 주소를 가져올 수 없습니다.\n인기 동네나 검색을 이용해주세요.');
      }
    } catch (error: any) {
      // 개발 환경에서는 더 조용한 로깅
      const isDevelopment = process.env.NODE_ENV === 'development' || 
                            window.location.hostname === 'localhost' || 
                            window.location.hostname === '127.0.0.1';
      
      if (isDevelopment) {
        // 개발 환경에서는 GPS 실패를 warn으로만 표시하고 반복 방지
        console.warn('📍 개발환경: GPS 실패 (정상) -', error.message.substring(0, 50));
      } else {
        console.error('현재 위치 조회 실패:', error);
      }
      
      let title = '위치 조회 실패';
      let message = '현재 위치를 가져올 수 없습니다.';
      let actions = [
        { text: '인기 동네 보기', onPress: () => setActiveTab('popular') },
        { text: '직접 검색', onPress: () => setActiveTab('search') }
      ];

      if (error?.message?.includes('권한')) {
        title = '위치 권한 필요';
        message = '위치 접근 권한이 필요합니다.\n\n📍 브라우저 주소창 왼쪽 🔒 아이콘을 클릭하여\n위치 권한을 허용해주세요.';
        actions.push({ 
          text: '다시 시도', 
          onPress: () => setTimeout(() => handleGetCurrentLocation(), 100)
        });
      } else if (error?.message?.includes('시간')) {
        title = '시간 초과';
        message = '위치 조회 시간이 초과되었습니다.\n잠시 후 다시 시도해주세요.';
        actions.push({ 
          text: '다시 시도', 
          onPress: () => setTimeout(() => handleGetCurrentLocation(), 1000)
        });
      } else if (error?.message?.includes('사용할 수 없습니다')) {
        title = 'GPS 서비스 오류';
        message = 'GPS 서비스를 사용할 수 없습니다.\n실외에서 다시 시도하거나 다른 방법을 이용해주세요.';
      }
      
      // GPS 실패 시 Alert 대신 조용히 처리하고 인기 동네 탭으로 이동
      console.warn(`📍 GPS 실패: ${title} - ${error.message.substring(0, 50)}`);
      setActiveTab('popular'); // 자동으로 인기 동네 탭으로 이동
    } finally {
      setLoading(false);
    }
  };

  // 주소 검색
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      const results = await locationService.searchAddress(searchQuery);
      setSearchResults(results);
      setActiveTab('search');
    } catch (error) {
      console.error('주소 검색 실패:', error);
      Alert.alert('검색 오류', '주소 검색에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 인기 동네 선택
  const handlePopularSelect = (district: string, neighborhood: string) => {
    console.log('📍 인기 동네 클릭됨:', { district, neighborhood });
    onSelect(district, neighborhood);
    onClose();
  };

  // 검색 결과 선택
  const handleSearchResultSelect = (result: SearchResult) => {
    onSelect(result.district, result.neighborhood);
    onClose();
  };

  // 빠른 구 선택 - 대표 동네로 자동 설정
  const handleQuickDistrictSelect = (district: string) => {
    const districtDefaults = {
      '강남구': '역삼동',
      '서초구': '서초동', 
      '송파구': '잠실동',
      '마포구': '홍대입구',
      '용산구': '한남동',
      '종로구': '종로1가',
      '중구': '을지로동',
      '영등포구': '여의도동',
      '관악구': '신림동',
      '동작구': '사당동'
    };
    
    const defaultNeighborhood = districtDefaults[district as keyof typeof districtDefaults] || '역삼동';
    onSelect(district, defaultNeighborhood);
    onClose();
  };

  const renderCurrentLocationTab = () => (
    <View style={styles.tabContent}>
      {/* 카카오 지도로 위치 선택 */}
      <TouchableOpacity
        style={styles.locationButton}
        onPress={handleOpenKakaoMap}
      >
        <Icon name="map" size={24} color={COLORS.primary.main} />
        <View style={styles.locationButtonText}>
          <Text style={styles.locationButtonTitle}>
            🗺️ 지도에서 위치 선택
          </Text>
          <Text style={styles.locationButtonSubtitle}>
            카카오 지도로 정확한 위치를 선택할 수 있어요
          </Text>
        </View>
        <Icon name="chevron-right" size={20} color={COLORS.text.secondary} />
      </TouchableOpacity>

      {/* GPS 현재 위치 자동 감지 */}
      <TouchableOpacity
        style={[styles.locationButton, loading && styles.locationButtonDisabled]}
        onPress={handleGetCurrentLocation}
        disabled={loading}
      >
        <Icon name="navigation" size={24} color={COLORS.secondary.main} />
        <View style={styles.locationButtonText}>
          <Text style={styles.locationButtonTitle}>
            {loading ? '위치 조회 중...' : '📍 GPS 자동 감지'}
          </Text>
          <Text style={styles.locationButtonSubtitle}>
            {loading 
              ? '카카오 지도로 정확한 위치 찾는 중...' 
              : 'GPS로 현재 위치를 자동으로 찾아드려요'
            }
          </Text>
        </View>
        <Icon name="chevron-right" size={20} color={COLORS.text.secondary} />
      </TouchableOpacity>

      {/* 추천 동네 (GPS 대신 사용) */}
      <View style={styles.recommendedContainer}>
        <Text style={styles.recommendedTitle}>🎯 추천 동네 (GPS 대신 선택)</Text>
        <TouchableOpacity
          style={styles.recommendedButton}
          onPress={() => handleQuickDistrictSelect('강남구')}
        >
          <Text style={styles.recommendedEmoji}>🏢</Text>
          <View style={styles.recommendedTextContainer}>
            <Text style={styles.recommendedMainText}>강남구 역삼동</Text>
            <Text style={styles.recommendedSubText}>직장인들의 핫플레이스</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* 서울시 구별 빠른 선택 */}
      <View style={styles.quickSelectContainer}>
        <Text style={styles.quickSelectTitle}>📍 서울시 구별 빠른 선택</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.quickSelectScroll}
        >
          {[
            { district: '강남구', emoji: '🏢' },
            { district: '서초구', emoji: '🌳' },
            { district: '송파구', emoji: '🏊' },
            { district: '마포구', emoji: '🎭' },
            { district: '용산구', emoji: '🗼' },
            { district: '종로구', emoji: '🏛️' },
            { district: '중구', emoji: '💼' },
            { district: '영등포구', emoji: '🏦' },
            { district: '관악구', emoji: '🏫' },
            { district: '동작구', emoji: '🌉' }
          ].map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.quickSelectButton}
              onPress={() => handleQuickDistrictSelect(item.district)}
            >
              <Text style={styles.quickSelectEmoji}>{item.emoji}</Text>
              <Text style={styles.quickSelectText}>{item.district}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 위치 권한 안내 */}
      <View style={styles.locationGuideContainer}>
        <Text style={styles.locationGuideTitle}>⚠️ 위치 감지 안내</Text>
        <Text style={styles.locationGuideText}>
          • HTTP 환경(localhost)에서는 위치 서비스가 제한됩니다{'\n'}
          • 크롬: 주소창 🔒 → 위치 → 허용 → 새로고침{'\n'}
          • 위치가 안 잡히면 아래 '서울시 구별 선택' 또는 '인기 동네' 이용하세요
        </Text>
      </View>

      {currentNeighborhood && (
        <View style={styles.currentNeighborhoodContainer}>
          <Text style={styles.currentNeighborhoodTitle}>현재 설정된 동네</Text>
          <TouchableOpacity
            style={styles.currentNeighborhoodItem}
            onPress={() => handlePopularSelect(currentNeighborhood.district, currentNeighborhood.neighborhood)}
          >
            <Text style={styles.currentNeighborhoodText}>
              {currentNeighborhood.district} {currentNeighborhood.neighborhood}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderPopularTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>인기 동네</Text>
      <ScrollView style={styles.popularList} showsVerticalScrollIndicator={false}>
        {popularNeighborhoods.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.popularItem}
            onPress={() => handlePopularSelect(item.district, item.neighborhood)}
          >
            <Text style={styles.popularItemText}>
              {item.district} {item.neighborhood}
            </Text>
            <Icon name="chevron-right" size={16} color={COLORS.text.secondary} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderSearchTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={20} color={COLORS.text.secondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="동네 이름이나 주소를 검색하세요"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="x" size={20} color={COLORS.text.secondary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.searchButton, loading && styles.searchButtonDisabled]}
          onPress={handleSearch}
          disabled={loading || !searchQuery.trim()}
        >
          <Text style={styles.searchButtonText}>검색</Text>
        </TouchableOpacity>
      </View>

      {searchResults.length > 0 && (
        <ScrollView style={styles.searchResults} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>검색 결과</Text>
          {searchResults.map((result, index) => (
            <TouchableOpacity
              key={index}
              style={styles.searchResultItem}
              onPress={() => handleSearchResultSelect(result)}
            >
              <View style={styles.searchResultInfo}>
                <Text style={styles.searchResultTitle}>
                  {result.district} {result.neighborhood}
                </Text>
                <Text style={styles.searchResultAddress}>{result.fullAddress}</Text>
              </View>
              <Icon name="chevron-right" size={16} color={COLORS.text.secondary} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="x" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>동네 설정</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        {/* 탭 네비게이션 */}
        <View style={styles.tabNavigation}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'current' && styles.activeTabButton]}
            onPress={() => setActiveTab('current')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'current' && styles.activeTabButtonText]}>
              현재 위치
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'popular' && styles.activeTabButton]}
            onPress={() => setActiveTab('popular')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'popular' && styles.activeTabButtonText]}>
              인기 동네
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'search' && styles.activeTabButton]}
            onPress={() => setActiveTab('search')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'search' && styles.activeTabButtonText]}>
              검색
            </Text>
          </TouchableOpacity>
        </View>

        {/* 탭 컨텐츠 */}
        {activeTab === 'current' && renderCurrentLocationTab()}
        {activeTab === 'popular' && renderPopularTab()}
        {activeTab === 'search' && renderSearchTab()}
      </View>

      {/* 카카오 지도 모달 */}
      <KakaoMapModal
        visible={showMapModal}
        onClose={() => setShowMapModal(false)}
        onLocationSelect={handleKakaoMapLocationSelect}
      />
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
  headerPlaceholder: {
    width: 32,
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: COLORS.primary.main,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.secondary,
  },
  activeTabButtonText: {
    color: COLORS.primary.main,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    ...SHADOWS.small,
  },
  locationButtonDisabled: {
    opacity: 0.6,
  },
  locationButtonText: {
    flex: 1,
    marginLeft: 12,
  },
  locationButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  locationButtonSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  currentNeighborhoodContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    ...SHADOWS.small,
  },
  currentNeighborhoodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  currentNeighborhoodItem: {
    paddingVertical: 8,
  },
  currentNeighborhoodText: {
    fontSize: 16,
    color: COLORS.primary.main,
    fontWeight: '500',
  },
  locationGuideContainer: {
    backgroundColor: COLORS.secondary.light,
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary.main,
  },
  locationGuideTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary.dark,
    marginBottom: 8,
  },
  locationGuideText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  popularList: {
    backgroundColor: 'white',
    borderRadius: 12,
    maxHeight: 400,
    ...SHADOWS.small,
  },
  popularItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
  },
  popularItemText: {
    fontSize: 16,
    color: COLORS.text.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
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
  searchButton: {
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  searchButtonDisabled: {
    opacity: 0.6,
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  searchResults: {
    backgroundColor: 'white',
    borderRadius: 12,
    maxHeight: 400,
    ...SHADOWS.small,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  searchResultAddress: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  quickSelectContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...SHADOWS.small,
  },
  quickSelectTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  quickSelectScroll: {
    flexDirection: 'row',
  },
  quickSelectButton: {
    alignItems: 'center',
    backgroundColor: COLORS.primary.light,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    minWidth: 80,
    borderWidth: 1,
    borderColor: COLORS.primary.main,
  },
  quickSelectEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  quickSelectText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.primary.dark,
    textAlign: 'center',
  },
  recommendedContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.primary.main,
    ...SHADOWS.medium,
  },
  recommendedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary.main,
    marginBottom: 12,
    textAlign: 'center',
  },
  recommendedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary.light,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.primary.main,
  },
  recommendedEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  recommendedTextContainer: {
    flex: 1,
  },
  recommendedMainText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary.dark,
    marginBottom: 4,
  },
  recommendedSubText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
});

export default NeighborhoodSelector;