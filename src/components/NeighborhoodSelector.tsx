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

  const popularNeighborhoods = locationService.getPopularNeighborhoods();

  // 현재 위치 가져오기
  const handleGetCurrentLocation = async () => {
    try {
      setLoading(true);
      
      // 위치 권한 확인
      const hasPermission = await locationService.checkLocationPermission();
      if (!hasPermission) {
        Alert.alert(
          '위치 권한 필요',
          '현재 위치를 사용하려면 위치 권한을 허용해주세요.\n\n브라우저 설정에서 위치 권한을 허용하거나, 아래 옵션을 선택해주세요:',
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
              text: '다시 시도',
              onPress: () => {
                // 권한 재요청을 위해 함수 재호출
                setTimeout(() => handleGetCurrentLocation(), 100);
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
        Alert.alert('오류', '현재 위치의 주소를 가져올 수 없습니다.');
      }
    } catch (error) {
      console.error('현재 위치 조회 실패:', error);
      
      let errorMessage = '현재 위치를 가져올 수 없습니다.';
      if (error.message.includes('권한')) {
        errorMessage = '위치 접근 권한이 필요합니다.\n브라우저 설정에서 위치 권한을 허용해주세요.';
      } else if (error.message.includes('시간')) {
        errorMessage = '위치 조회 시간이 초과되었습니다.\n다시 시도해주세요.';
      } else if (error.message.includes('사용할 수 없습니다')) {
        errorMessage = 'GPS 서비스를 사용할 수 없습니다.\n인기 동네나 검색을 이용해주세요.';
      }
      
      Alert.alert(
        '위치 조회 실패',
        errorMessage,
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
            text: '확인',
            style: 'cancel'
          }
        ]
      );
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
    onSelect(district, neighborhood);
    onClose();
  };

  // 검색 결과 선택
  const handleSearchResultSelect = (result: SearchResult) => {
    onSelect(result.district, result.neighborhood);
    onClose();
  };

  const renderCurrentLocationTab = () => (
    <View style={styles.tabContent}>
      <TouchableOpacity
        style={[styles.locationButton, loading && styles.locationButtonDisabled]}
        onPress={handleGetCurrentLocation}
        disabled={loading}
      >
        <Icon name="map-pin" size={24} color={COLORS.primary.main} />
        <View style={styles.locationButtonText}>
          <Text style={styles.locationButtonTitle}>
            {loading ? '위치 조회 중...' : '현재 위치 사용'}
          </Text>
          <Text style={styles.locationButtonSubtitle}>
            {loading 
              ? '잠시만 기다려주세요' 
              : 'GPS로 정확한 위치를 찾아드려요'
            }
          </Text>
        </View>
        <Icon name="chevron-right" size={20} color={COLORS.text.secondary} />
      </TouchableOpacity>

      {/* 위치 권한 안내 */}
      <View style={styles.locationGuideContainer}>
        <Text style={styles.locationGuideTitle}>💡 위치 권한 안내</Text>
        <Text style={styles.locationGuideText}>
          • 브라우저 주소창에서 위치 권한을 허용해주세요{'\n'}
          • 로컬 개발환경(HTTP)에서는 위치 서비스가 제한될 수 있습니다{'\n'}
          • 권한이 작동하지 않으면 아래 '인기 동네'나 '검색' 탭을 이용해주세요
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
    backgroundColor: '#FFF8DC',
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
  },
  locationGuideTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B8860B',
    marginBottom: 8,
  },
  locationGuideText: {
    fontSize: 13,
    color: '#8B7355',
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
});

export default NeighborhoodSelector;