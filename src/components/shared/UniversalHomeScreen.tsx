import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  RefreshControl,
  Image,
} from 'react-native';
import {COLORS, SHADOWS} from '../../styles/colors';
import {Icon} from '../Icon';
import { NotificationBell } from '../NotificationBell';
import NeighborhoodSelector from '../NeighborhoodSelector';
import NativeMapModal from '../NativeMapModal';
import MeetupCardSkeleton from '../skeleton/MeetupCardSkeleton';
import EmptyState from '../EmptyState';
import ErrorState from '../ErrorState';
import { useUserStore } from '../../store/userStore';
import { useMeetupStore } from '../../store/meetupStore';
import { FOOD_CATEGORIES } from '../../constants/categories';
import Popup from '../Popup';
import { usePopup } from '../../hooks/usePopup';
import { getTimeDifference } from '../../utils/timeUtils';

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
  NotificationBanner?: React.ComponentType<any>;
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
  const scrollViewRef = useRef<ScrollView>(null);

  // 상태 관리
  const [showCreateMeetup, setShowCreateMeetup] = useState(false);
  const [showMapTest, setShowMapTest] = useState(false);
  const [showNeighborhoodSelector, setShowNeighborhoodSelector] = useState(false);
  const [showNeighborhoodMapModal, setShowNeighborhoodMapModal] = useState(false);
  const [currentNeighborhood, setCurrentNeighborhood] = useState<{ district: string; neighborhood: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    const neighborhood = storeUser?.neighborhood;
    const fetchPromise = (neighborhood?.latitude && neighborhood?.longitude)
      ? fetchHomeMeetups({
          latitude: neighborhood.latitude,
          longitude: neighborhood.longitude,
          radius: neighborhood.radius || 3000,
        })
      : fetchHomeMeetups();

    fetchPromise
      .catch(() => setFetchError(true))
      .finally(() => setRefreshing(false));
  }, [storeUser?.neighborhood, fetchHomeMeetups]);

  const {
    popupState,
    hidePopup,
    showSuccess,
  } = usePopup();

  // 데이터 로딩 - 사용자 위치 기반
  useEffect(() => {
    const loadMeetups = () => {
      setFetchError(false);
      const neighborhood = storeUser?.neighborhood;
      const fetchPromise = (neighborhood?.latitude && neighborhood?.longitude)
        ? fetchHomeMeetups({
            latitude: neighborhood.latitude,
            longitude: neighborhood.longitude,
            radius: neighborhood.radius || 3000,
          })
        : fetchHomeMeetups();

      fetchPromise
        .catch(() => setFetchError(true))
        .finally(() => setIsLoading(false));
    };

    loadMeetups();
  }, [storeUser?.neighborhood?.latitude, storeUser?.neighborhood?.longitude, storeUser?.neighborhood?.radius]);

  // 위치 설정 - React Native에서는 기본값을 사용
  useEffect(() => {
    setCurrentNeighborhood({
      district: '강남구',
      neighborhood: '역삼동'
    });
  }, []);

  // ─── 섹션별 모임 데이터 분류 (useMemo로 최적화) ─────────
  const soonMeetups = useMemo(() => {
    const now = new Date();
    return meetups
      .filter((m: any) => {
        if (!m.date) return false;
        const meetupDate = new Date(m.date);
        const diffMs = meetupDate.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        return diffHours > -2 && diffHours < 48 && m.status === 'recruiting';
      })
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 10);
  }, [meetups]);

  const newMeetups = useMemo(() => {
    return [...meetups]
      .sort((a: any, b: any) => {
        const aTime = new Date(a.createdAt || a.updatedAt).getTime();
        const bTime = new Date(b.createdAt || b.updatedAt).getTime();
        return bTime - aTime;
      })
      .slice(0, 6);
  }, [meetups]);

  const recruitingMeetups = useMemo(() => {
    return meetups
      .filter((m: any) => m.status === 'recruiting')
      .slice(0, 10);
  }, [meetups]);

  // 이벤트 핸들러들
  const handleMeetupClick = useCallback((meetup: any) => {
    const meetupId = typeof meetup === 'string' ? meetup : meetup.id;
    navigation.navigate('MeetupDetail', { meetupId });
  }, [navigation]);

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      navigation.navigate('AISearchResult', { query: searchQuery, autoSearch: true });
    }
  };

  const handleSearchInput = (text: string) => {
    setSearchQuery(text);
  };

  const handleLocationSelect = (district: string, neighborhood: string) => {
    updateNeighborhood(district, neighborhood);
    setCurrentNeighborhood({ district, neighborhood });
    setShowNeighborhoodMapModal(false);
    setShowNeighborhoodSelector(false);
    fetchHomeMeetups();
  };

  // NativeMapModal에서 위치 선택 처리 (lat, lng, address, radius 포함)
  const handleMapLocationSelect = (district: string, neighborhood: string, lat: number, lng: number, address: string, radius?: number) => {
    const radiusInMeters = radius ? radius * 1000 : 3000;
    updateNeighborhood(district, neighborhood, lat, lng, radiusInMeters);
    setCurrentNeighborhood({ district, neighborhood });
    setShowNeighborhoodMapModal(false);
    fetchHomeMeetups({
      latitude: lat,
      longitude: lng,
      radius: radiusInMeters,
    });
  };

  // NeighborhoodSelector에서 지도 모달 열기 요청 처리
  const handleOpenMapModal = () => {
    setShowNeighborhoodSelector(false);
    setTimeout(() => {
      setShowNeighborhoodMapModal(true);
    }, 300);
  };

  const openNeighborhoodSelector = () => {
    setShowNeighborhoodSelector(true);
  };

  const handleRetry = () => {
    setIsLoading(true);
    setFetchError(false);
    const neighborhood = storeUser?.neighborhood;
    const fetchPromise = (neighborhood?.latitude && neighborhood?.longitude)
      ? fetchHomeMeetups({
          latitude: neighborhood.latitude,
          longitude: neighborhood.longitude,
          radius: neighborhood.radius || 3000,
        })
      : fetchHomeMeetups();

    fetchPromise
      .catch(() => setFetchError(true))
      .finally(() => setIsLoading(false));
  };

  // ─── 스켈레톤 렌더링 ─────────────────
  const renderListSkeletons = () => (
    <View style={styles.meetupList}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.meetupListItemSkeleton}>
          <MeetupCardSkeleton variant="list" />
        </View>
      ))}
    </View>
  );

  // ─── 모임 리스트 아이템 렌더링 ─────────────────
  const renderMeetupListItem = (meetup: any) => {
    if (!meetup.id) return null;

    const imageUri = meetup.image
      ? (meetup.image.startsWith('http') ? meetup.image : `https://eattable.kr${meetup.image}`)
      : undefined;

    return (
      <TouchableOpacity
        key={meetup.id}
        style={styles.meetupListItem}
        onPress={() => handleMeetupClick(meetup)}
        activeOpacity={0.7}
        accessibilityLabel={meetup.title}
      >
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.meetupThumbnail} />
        ) : (
          <View style={[styles.meetupThumbnail, styles.meetupThumbnailPlaceholder]}>
            <Icon name="image" size={24} color={COLORS.neutral.grey300} />
          </View>
        )}
        <View style={styles.meetupListItemContent}>
          <Text style={styles.meetupListItemTitle} numberOfLines={1}>{meetup.title}</Text>
          <Text style={styles.meetupListItemDesc} numberOfLines={1}>{meetup.description}</Text>
          <View style={styles.meetupListItemMeta}>
            <View style={styles.meetupMetaItem}>
              <Icon name="map-pin" size={12} color="#878B94" />
              <Text style={styles.meetupMetaText}>{meetup.location || '미정'}</Text>
            </View>
            <View style={styles.meetupMetaItem}>
              <Icon name="users" size={12} color="#878B94" />
              <Text style={styles.meetupMetaText}>{meetup.currentParticipants}/{meetup.maxParticipants}</Text>
            </View>
            <Text style={styles.meetupTimeText}>{getTimeDifference(meetup.createdAt)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* ─── Header ─── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.locationButton}
            onPress={openNeighborhoodSelector}
            activeOpacity={0.7}
            accessibilityLabel="동네 변경"
            accessibilityRole="button"
          >
            <Text style={styles.locationText} numberOfLines={1}>
              {currentNeighborhood ? `${currentNeighborhood.neighborhood}` : '역삼동'}
            </Text>
            {storeUser?.neighborhood?.radius && (
              <Text style={styles.radiusText} numberOfLines={1}>
                {formatRadius(storeUser.neighborhood.radius)}
              </Text>
            )}
            <Icon name="chevron-down" size={14} color="#121212" />
          </TouchableOpacity>

          <View style={styles.headerRight}>
            <NotificationBell
              userId={user?.id?.toString()}
              onPress={() => {
                navigation.navigate('Notifications');
              }}
              color="#121212"
              size={24}
            />
          </View>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={100}
          bounces={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary.accent}
              colors={[COLORS.primary.accent]}
            />
          }
        >
          {/* ─── Search Bar ─── */}
          <View style={styles.searchSection}>
            <View style={styles.searchBar}>
              <TextInput
                style={styles.searchInput}
                placeholder="신청한 모임을 찾아봐요"
                placeholderTextColor="#7E8082"
                value={searchQuery}
                onChangeText={handleSearchInput}
                onSubmitEditing={handleSearch}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                accessibilityLabel="약속 검색"
              />
              <TouchableOpacity
                onPress={handleSearch}
                activeOpacity={0.7}
                accessibilityLabel="검색"
                style={styles.searchIconButton}
              >
                <Icon name="search" size={20} color="#7E8082" />
              </TouchableOpacity>
            </View>
          </View>

          {/* ─── Category Grid (4 columns x 2 rows) ─── */}
          <View style={styles.categorySection}>
            <View style={styles.categoryGrid}>
              {FOOD_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={styles.categoryGridItem}
                  onPress={() => navigation.navigate('MeetupList', { category: category.name })}
                  activeOpacity={0.7}
                  accessibilityLabel={`${category.name} 카테고리`}
                  accessibilityRole="button"
                >
                  <View style={styles.categoryImageWrapper}>
                    <Image
                      source={{ uri: `https://eattable.kr${category.image}` }}
                      style={styles.categoryImage}
                      resizeMode="cover"
                    />
                  </View>
                  <Text style={styles.categoryLabel} numberOfLines={1}>{category.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ─── Banner Placeholder ─── */}
          <View style={styles.bannerSection}>
            <View style={styles.bannerPlaceholder} />
          </View>

          {/* ─── Meetup List: 바로 참여할 수 있는 번개 ─── */}
          <View style={styles.meetupSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>바로 참여할 수 있는 번개</Text>
            </View>

            {isLoading ? (
              renderListSkeletons()
            ) : fetchError ? (
              <ErrorState onRetry={handleRetry} />
            ) : soonMeetups.length > 0 ? (
              <View style={styles.meetupList}>
                {soonMeetups.map(renderMeetupListItem)}
              </View>
            ) : recruitingMeetups.length > 0 ? (
              <View style={styles.meetupList}>
                {recruitingMeetups.map(renderMeetupListItem)}
              </View>
            ) : null}
          </View>

          {/* 밥약속이 전혀 없을 때 */}
          {!isLoading && !fetchError && meetups.length === 0 && (
            <EmptyState
              icon={'\uD83C\uDF7D\uFE0F'}
              title="아직 등록된 밥약속이 없어요"
              description="첫 번째 밥약속을 만들어보세요!"
              actionLabel="약속 만들기"
              onAction={() => navigation.navigate('CreateMeetup')}
            />
          )}

          {/* 지도 테스트 버튼 (디버그용 - 개발 환경에서만 표시) */}
          {__DEV__ && (
            <TouchableOpacity
              style={styles.testButton}
              onPress={() => setShowMapTest(true)}
            >
              <Text style={styles.testButtonText}>지도테스트</Text>
            </TouchableOpacity>
          )}

          {/* 하단 여백 */}
          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* ─── FAB (57px orange circle) ─── */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('CreateMeetup')}
          activeOpacity={0.7}
          accessibilityLabel="새 약속 만들기"
          accessibilityRole="button"
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>

        {/* ─── 모달들 ─── */}
        <NeighborhoodSelector
          visible={showNeighborhoodSelector}
          onClose={() => {
            setShowNeighborhoodSelector(false);
          }}
          onSelect={handleLocationSelect}
          currentNeighborhood={currentNeighborhood}
          onOpenMapModal={handleOpenMapModal}
        />

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
              showSuccess('밥약속이 성공적으로 만들어졌습니다!');
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
          onClose={hidePopup}
          type={popupState.type}
          title={popupState.title}
          message={popupState.message}
          buttons={popupState.buttons}
          showCloseButton={popupState.showCloseButton}
          backdrop={popupState.backdrop}
          animation={popupState.animation}
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
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // ─── Header ──────────────────────────────────────────
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.06)',
    zIndex: 10,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#121212',
  },
  radiusText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#878B94',
    marginLeft: 2,
  },
  headerRight: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
  },

  // ─── ScrollView ──────────────────────────────────────
  scrollView: {
    flex: 1,
  },

  // ─── Search Bar ──────────────────────────────────────
  searchSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    backgroundColor: '#F5F5F5',
    borderRadius: 22,
    paddingHorizontal: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#121212',
    paddingVertical: 0,
  },
  searchIconButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── Category Grid (4 col x 2 row) ──────────────────
  categorySection: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 26,
  },
  categoryGridItem: {
    width: '23%',
    alignItems: 'center',
  },
  categoryImageWrapper: {
    width: 74,
    height: 74,
    borderRadius: 37,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  categoryImage: {
    width: 74,
    height: 74,
    borderRadius: 37,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D2E2F',
    marginTop: 8,
    textAlign: 'center',
  },

  // ─── Banner Placeholder ──────────────────────────────
  bannerSection: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  bannerPlaceholder: {
    height: 86,
    backgroundColor: '#BEBEBE',
    borderRadius: 20,
  },

  // ─── Meetup Section ──────────────────────────────────
  meetupSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#121212',
  },

  // ─── Meetup List ─────────────────────────────────────
  meetupList: {
    gap: 24,
  },
  meetupListItem: {
    flexDirection: 'row',
    gap: 18,
    alignItems: 'center',
  },
  meetupThumbnail: {
    width: 70,
    height: 70,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
  },
  meetupThumbnailPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  meetupListItemContent: {
    flex: 1,
    gap: 4,
  },
  meetupListItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#121212',
  },
  meetupListItemDesc: {
    fontSize: 14,
    fontWeight: '400',
    color: '#293038',
  },
  meetupListItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  meetupMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  meetupMetaText: {
    fontSize: 14,
    color: '#878B94',
  },
  meetupTimeText: {
    fontSize: 14,
    color: '#121212',
  },
  meetupListItemSkeleton: {
    marginBottom: 16,
  },

  // ─── FAB (57px orange circle) ────────────────────────
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 57,
    height: 57,
    borderRadius: 28.5,
    backgroundColor: '#FFA529',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    ...SHADOWS.fab,
  },
  fabIcon: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '300',
    lineHeight: 30,
    marginTop: -1,
  },

  // ─── Test Button (debug) ─────────────────────────────
  testButton: {
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    margin: 20,
    alignSelf: 'flex-start',
  },
  testButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // ─── Bottom Padding ──────────────────────────────────
  bottomPadding: {
    height: 96,
  },
});

export default UniversalHomeScreen;
