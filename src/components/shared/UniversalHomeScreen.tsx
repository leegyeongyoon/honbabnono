import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
} from 'react-native';
import {COLORS, SHADOWS, LAYOUT} from '../../styles/colors';
import {Icon} from '../Icon';
import { NotificationBell } from '../NotificationBell';
import NeighborhoodSelector from '../NeighborhoodSelector';
import NativeMapModal from '../NativeMapModal';
import MeetupCard from '../MeetupCard';
import locationService from '../../services/locationService';
import { useUserStore } from '../../store/userStore';
import { useMeetupStore } from '../../store/meetupStore';
import { FOOD_CATEGORIES } from '../../constants/categories';
import AdvertisementBanner from '../AdvertisementBanner';
import { useMeetups } from '../../hooks/useMeetups';
import { aiSearchService } from '../../services/aiSearchService';
import Popup from '../Popup';
import { usePopup } from '../../hooks/usePopup';
import { useNotificationBanner } from '../../hooks/useNotificationBanner';
import NotificationBanner from '../NotificationBanner';
import nativeBridge from '../../utils/nativeBridge';
import { formatMeetupDateTime } from '../../utils/dateUtils';

// 플랫폼별 네비게이션 인터페이스
interface NavigationAdapter {
  navigate: (screen: string, params?: any) => void;
  goBack?: () => void;
}

interface UniversalHomeScreenProps {
  navigation: NavigationAdapter;
  user?: any;
  navigateToLogin?: () => void;
  // 플랫폼별 컴포넌트들
  CreateMeetupModal?: React.ComponentType<any>;
  MapTestModal?: React.ComponentType<any>;
  NeighborhoodModal?: React.ComponentType<any>;
}

// 반경 포맷팅 함수
const formatRadius = (radiusInMeters: number | undefined): string => {
  if (!radiusInMeters) {return '3km';}
  if (radiusInMeters < 1000) {
    return `${radiusInMeters}m`;
  }
  return `${(radiusInMeters / 1000).toFixed(1)}km`;
};

const UniversalHomeScreen: React.FC<UniversalHomeScreenProps> = ({
  navigation,
  user,
  navigateToLogin,
  CreateMeetupModal,
  MapTestModal,
  NotificationBanner,
}) => {
  const { updateNeighborhood, user: storeUser } = useUserStore();
  const { meetups, fetchHomeMeetups } = useMeetupStore();
  const { searchMeetups, meetups: searchResults, loading: searchLoading } = useMeetups();
  
  // 상태 관리
  const [showCreateMeetup, setShowCreateMeetup] = useState(false);
  const [showMapTest, setShowMapTest] = useState(false);
  const [showNeighborhoodSelector, setShowNeighborhoodSelector] = useState(false);
  const [showNeighborhoodMapModal, setShowNeighborhoodMapModal] = useState(false);  // 지도 모달 상태 (부모에서 관리)
  const [currentNeighborhood, setCurrentNeighborhood] = useState<{ district: string; neighborhood: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  
  const { 
    popupState, 
    hidePopup, 
    showSuccess, 
    showError, 
    showWarning, 
    showInfo, 
    showConfirm, 
    showAlert 
  } = usePopup();

  // 검색 제안 데이터
  const searchSuggestions = [
    '근처 한식당 찾기',
    '오늘 저녁 함께 먹을 사람',
    '중국집 배달 같이 시킬 사람',
    '카페에서 브런치',
    '혼밥족 모임',
    '맛집 탐방 친구',
    '치킨 같이 먹기',
    '분위기 좋은 술집',
  ];

  // 데이터 로딩 - 사용자 위치 기반
  useEffect(() => {
    const loadMeetups = () => {
      const neighborhood = storeUser?.neighborhood;
      if (neighborhood?.latitude && neighborhood?.longitude) {
        // 위치 정보가 있으면 위치 기반 검색
        fetchHomeMeetups({
          latitude: neighborhood.latitude,
          longitude: neighborhood.longitude,
          radius: neighborhood.radius || 3000, // 기본 3km
        });
      } else {
        // 위치 정보 없으면 기본 검색
        fetchHomeMeetups();
      }
    };

    loadMeetups();
  }, [storeUser?.neighborhood?.latitude, storeUser?.neighborhood?.longitude, storeUser?.neighborhood?.radius]);

  // 위치 설정 - React Native에서는 기본값을 사용
  useEffect(() => {
    // React Native에서는 네이티브 위치 권한이 필요하므로 기본값 사용
    // TODO: React Native Geolocation API 통합 후 활성화
    setCurrentNeighborhood({
      district: '강남구',
      neighborhood: '역삼동'
    });
  }, []);

  // 이벤트 핸들러들
  const handleMeetupClick = (meetup: any) => {
    console.log('모임 클릭됨:', meetup);
    navigation.navigate('MeetupDetail', { meetupId: meetup.id });
  };

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      console.log('🔍 검색 화면으로 이동:', searchQuery);
      setShowSearchSuggestions(false);
      // AISearchResultScreen으로 이동하여 검색 실행
      navigation.navigate('AISearchResult', { query: searchQuery, autoSearch: true });
    }
  };

  const handleSuggestionPress = async (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSearchSuggestions(false);
    console.log('🔍 제안 검색 화면으로 이동:', suggestion);
    navigation.navigate('AISearchResult', { query: suggestion, autoSearch: true });
  };

  const handleLocationSelect = (district: string, neighborhood: string) => {
    console.log('위치 선택됨:', district, neighborhood);
    updateNeighborhood(district, neighborhood);
    setCurrentNeighborhood({ district, neighborhood });
    setShowNeighborhoodMapModal(false);  // 지도 모달 먼저 닫기
    setShowNeighborhoodSelector(false);
    // 위치 기반 검색 (좌표 없으면 기본 검색)
    fetchHomeMeetups();
  };

  // NativeMapModal에서 위치 선택 처리 (lat, lng, address, radius 포함)
  const handleMapLocationSelect = (district: string, neighborhood: string, lat: number, lng: number, address: string, radius?: number) => {
    console.log('🗺️ [UniversalHomeScreen] 지도에서 위치 선택됨:', { district, neighborhood, lat, lng, address, radius });
    // radius는 km 단위로 전달되므로 미터 단위로 변환하여 저장 (API는 미터 단위를 사용)
    const radiusInMeters = radius ? radius * 1000 : 3000; // 기본 3km
    updateNeighborhood(district, neighborhood, lat, lng, radiusInMeters);
    setCurrentNeighborhood({ district, neighborhood });
    setShowNeighborhoodMapModal(false);
    // 위치 기반 검색
    fetchHomeMeetups({
      latitude: lat,
      longitude: lng,
      radius: radiusInMeters,
    });
  };

  // NeighborhoodSelector에서 지도 모달 열기 요청 처리
  const handleOpenMapModal = () => {
    console.log('🗺️ [UniversalHomeScreen] 지도 모달 열기 요청');
    setShowNeighborhoodSelector(false);  // 먼저 NeighborhoodSelector 닫기
    // 약간의 딜레이 후 지도 모달 열기 (Modal 전환 애니메이션 대기)
    setTimeout(() => {
      setShowNeighborhoodMapModal(true);
    }, 300);
  };

  const getCategoryColor = (categoryName: string) => {
    const category = FOOD_CATEGORIES.find(cat => cat.name === categoryName);
    return category ? category.color : COLORS.primary.main;
  };

  const openNeighborhoodSelector = () => {
    console.log('🏠 [HomeScreen] 동네 선택 버튼 클릭됨');
    setShowNeighborhoodSelector(true);
  };

  const handleNotificationTest = () => {
    try {
      console.log('🧪 [DEBUG] handleNotificationTest 함수 호출됨');
      
      if (nativeBridge.isNativeApp()) {
        // 네이티브 앱에서 실행 중
        console.log('📱 [DEBUG] 네이티브 앱에서 실행 중 - scheduleNotification 호출');
        nativeBridge.scheduleNotification(
          '혼밥노노 알림', 
          '5초 후 네이티브 알림입니다! 🍚', 
          5,
          { type: 'scheduled', timestamp: new Date().toISOString() }
        );
        showInfo('5초 후 네이티브 알림이 표시됩니다...');
      } else {
        // 웹 브라우저에서 실행 중
        console.log('🌐 [DEBUG] 웹 브라우저에서 실행 중 - setTimeout 사용');
        setTimeout(() => {
          alert('5초 후 웹 알림입니다! 새로운 밥친구가 근처에 있어요 🍚');
        }, 5000);
        showInfo('5초 후 웹 알림이 표시됩니다...');
      }
    } catch (error) {
      console.error('❌ [DEBUG] 알림 예약 실패:', error);
      showError('알림 예약에 실패했습니다.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* 상단 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.locationButton} onPress={openNeighborhoodSelector}>
            <Icon name="map-pin" size={14} color={COLORS.text.white} style={{ marginRight: 4 }} />
            <Text style={styles.locationText}>
              {currentNeighborhood ? `${currentNeighborhood.district} ${currentNeighborhood.neighborhood}` : '위치 설정'}
            </Text>
            {storeUser?.neighborhood?.radius && (
              <Text style={styles.radiusText}>
                · {formatRadius(storeUser.neighborhood.radius)}
              </Text>
            )}
            <Icon name="chevron-down" size={14} color={COLORS.text.white} />
          </TouchableOpacity>

          <View style={styles.headerButtons}>
            <NotificationBell
              userId={user?.id?.toString()}
              onPress={() => {
                console.log('🔔 알림 버튼 클릭됨');
                navigation.navigate('Notifications');
              }}
              color={COLORS.text.white}
            />
          </View>
        </View>

      <ScrollView style={styles.scrollView}>

        {/* 검색 섹션 */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <Icon name="search" size={18} color={COLORS.text.tertiary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="오늘은 뭘 먹을까요? AI가 추천해드려요!"
                placeholderTextColor={COLORS.text.tertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={() => setShowSearchSuggestions(true)}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <>
                  <TouchableOpacity 
                    style={styles.clearButton}
                    onPress={() => setSearchQuery('')}
                  >
                    <Icon name="x" size={16} color={COLORS.text.tertiary} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.searchButton}
                    onPress={handleSearch}
                  >
                    <Text style={styles.searchButtonText}>검색</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
            
            {/* 검색 제안 */}
            {showSearchSuggestions && (
              <View style={styles.suggestionsContainer}>
                <Text style={styles.suggestionsLabel}>🍚 AI 검색 제안</Text>
                <View style={styles.suggestionsList}>
                  {searchSuggestions
                    .filter(suggestion => 
                      searchQuery.length === 0 || 
                      suggestion.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .slice(0, 4)
                    .map((suggestion, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.suggestionItem}
                        onPress={() => handleSuggestionPress(suggestion)}
                      >
                        <Text style={styles.suggestionText}>{suggestion}</Text>
                      </TouchableOpacity>
                    ))}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* 카테고리 그리드 */}
        <View style={styles.categorySection}>
          <View style={styles.categoryGrid}>
            {FOOD_CATEGORIES.map((category, index) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryItem}
                onPress={() => navigation.navigate('MeetupList', { category: category.name })}
              >
                <View style={[styles.categoryBox, { backgroundColor: category.bgColor }]}>
                  <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                </View>
                <Text style={styles.categoryName}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 광고 섹션 */}
        <AdvertisementBanner position="home_banner" navigation={navigation} />

        {/* 바로 참여할 수 있는 번개 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {storeUser?.neighborhood?.latitude
              ? `🔥 내 주변 ${formatRadius(storeUser.neighborhood.radius || 3000)} 이내 번개`
              : '바로 참여할 수 있는 번개'}
          </Text>

          {meetups.length > 0 && meetups.slice(0, 3).map((meetup, index) => {
            if (!meetup.id) {
              console.error('🚨 ERROR: Meetup has no ID!', meetup);
              return null;
            }
            return (
              <MeetupCard
                key={meetup.id}
                meetup={meetup}
                onPress={handleMeetupClick}
              />
            );
          })}

          {/* 모임이 없을 때 안내 메시지 */}
          {meetups.length === 0 && storeUser?.neighborhood?.latitude && (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>
                근처에 모임이 없어요 😢
              </Text>
              <TouchableOpacity
                style={styles.expandRadiusButton}
                onPress={openNeighborhoodSelector}
              >
                <Text style={styles.expandRadiusText}>반경 넓혀보기</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 오늘은 컵스밥! */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>오늘은 컵스밥!</Text>
        
          {meetups.length > 3 && meetups.slice(3, 6).map((meetup, index) => {
            if (!meetup.id) {
              console.error('🚨 ERROR: Meetup section 2 has no ID!', meetup);
              return null;
            }
            return (
              <MeetupCard 
                key={meetup.id}
                meetup={meetup}
                onPress={handleMeetupClick}
              />
            );
          })}

          {/* 더보기 버튼 */}
          <TouchableOpacity 
            style={styles.moreButton}
            onPress={() => navigation.navigate('MeetupList')}
          >
            <Text style={styles.moreButtonText}>더 많은 모임 보기</Text>
            <Icon name="chevron-right" size={16} color={COLORS.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* 지도 테스트 버튼 (디버그용 - 개발 환경에서만 표시) */}
        {__DEV__ && (
          <TouchableOpacity
            style={[styles.testButton, { backgroundColor: COLORS.primary.main, margin: 20 }]}
            onPress={() => setShowMapTest(true)}
          >
            <Text style={styles.testButtonText}>지도테스트</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* FAB 버튼 - 모임 생성 */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('CreateMeetup')}
        activeOpacity={0.8}
      >
        <Icon name="plus" size={28} color={COLORS.neutral.white} />
      </TouchableOpacity>

      {/* 모달들 */}
      <NeighborhoodSelector
        visible={showNeighborhoodSelector}
        onClose={() => {
          setShowNeighborhoodSelector(false);
        }}
        onSelect={handleLocationSelect}
        currentNeighborhood={currentNeighborhood}
        onOpenMapModal={handleOpenMapModal}
      />

      {/* NativeMapModal - NeighborhoodSelector와 분리하여 렌더링 */}
      <NativeMapModal
        visible={showNeighborhoodMapModal}
        onClose={() => setShowNeighborhoodMapModal(false)}
        onLocationSelect={handleMapLocationSelect}
        mode="settings"
        initialRadius={storeUser?.neighborhood?.radius ? Math.round(storeUser.neighborhood.radius / 1000) : undefined}
      />

      {CreateMeetupModal && (
        <CreateMeetupModal
          visible={showCreateMeetup}
          onClose={() => setShowCreateMeetup(false)}
          onSuccess={() => {
            setShowCreateMeetup(false);
            showSuccess('모임이 성공적으로 생성되었습니다!');
            fetchHomeMeetups();
          }}
        />
      )}

      {__DEV__ && MapTestModal && showMapTest && (
        <MapTestModal
          visible={showMapTest}
          onClose={() => setShowMapTest(false)}
        />
      )}

      <Popup
        visible={popupState.visible}
        type={popupState.type}
        title={popupState.title}
        message={popupState.message}
        onConfirm={() => {
          if (popupState.onConfirm) {popupState.onConfirm();}
          hidePopup();
        }}
        onCancel={() => {
          if (popupState.onCancel) {popupState.onCancel();}
          hidePopup();
        }}
        confirmText={popupState.confirmText}
        cancelText={popupState.cancelText}
      />

      {NotificationBanner && (
        <NotificationBanner />
      )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primary.main,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.HEADER_PADDING_HORIZONTAL,
    paddingVertical: LAYOUT.HEADER_PADDING_VERTICAL,
    backgroundColor: COLORS.primary.main,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.white,
    marginRight: 2,
  },
  radiusText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    marginRight: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  testButton: {
    backgroundColor: COLORS.functional.warning,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  testButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  searchSection: {
    backgroundColor: COLORS.neutral.white,
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  searchContainer: {
    position: 'relative',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.background,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: `${COLORS.primary.main}30`,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text.primary,
  },
  clearButton: {
    padding: 4,
    marginRight: 8,
  },
  searchButton: {
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  searchButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  suggestionsContainer: {
    backgroundColor: COLORS.neutral.white,
    marginTop: 8,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    ...SHADOWS.small,
  },
  suggestionsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  suggestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionItem: {
    backgroundColor: COLORS.neutral.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
  },
  suggestionText: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  categorySection: {
    backgroundColor: COLORS.neutral.white,
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
    gap: 8,
  },
  categoryItem: {
    width: '22.5%',
    alignItems: 'center',
    marginBottom: 20,
  },
  categoryBox: {
    width: 70,
    height: 70,
    borderRadius: 16,
    backgroundColor: COLORS.neutral.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
  },
  categoryEmoji: {
    fontSize: 36,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  section: {
    backgroundColor: COLORS.neutral.white,
    marginBottom: 12,
    paddingVertical: 20,
    borderRadius: 16,
    marginHorizontal: 20,
    ...SHADOWS.small,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text.primary,
    paddingHorizontal: 20,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  moreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: COLORS.neutral.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
  },
  moreButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginRight: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 1000,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    marginBottom: 16,
  },
  expandRadiusButton: {
    backgroundColor: COLORS.primary.main + '20',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.primary.main,
  },
  expandRadiusText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary.main,
  },
});

export default UniversalHomeScreen;