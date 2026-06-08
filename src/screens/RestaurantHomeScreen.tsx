import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useTypedNavigation } from '../hooks/useNavigation';
import { Icon, IconName } from '../components/Icon';
import { COLORS, CARD_STYLE } from '../styles/colors';
import { BORDER_RADIUS } from '../styles/spacing';
import restaurantApiService, { Restaurant } from '../services/restaurantApiService';

// ============================================================
// RestaurantHomeScreen — 잇테이블 v2 프로덕션 홈 (React Native)
// 웹(.web.tsx)과 데이터/로직 동일, UI만 RN으로 포팅
// ============================================================

// 네이티브 환경에서만 Geolocation 모듈 로드 (웹은 navigator.geolocation 사용)
let Geolocation: any = null;
if (Platform.OS !== 'web') {
  try {
    Geolocation = require('@react-native-community/geolocation').default;
  } catch (_e) {
    // 모듈 없음 — 내 주변 매장은 생략
  }
}

const CATEGORIES = [
  { id: 'all', label: '전체', emoji: '🍽️' },
  { id: 'shabu', label: '샤브샤브', emoji: '🫕' },
  { id: 'meat', label: '고깃집', emoji: '🥩' },
  { id: 'stew', label: '전골/찜', emoji: '🍲' },
  { id: 'hotpot', label: '훠궈', emoji: '🥘' },
  { id: 'course', label: '코스요리', emoji: '🍷' },
  { id: 'korean', label: '한식', emoji: '🍚' },
  { id: 'japanese', label: '일식', emoji: '🍣' },
  { id: 'chinese', label: '중식', emoji: '🥟' },
  { id: 'western', label: '양식', emoji: '🍝' },
  { id: 'buffet', label: '뷔페', emoji: '🥗' },
];

// 웹의 path → RN 스크린명/params 매핑. 매핑이 없으면 navigate 생략(빈 screen).
const QUICK_ACTIONS: { icon: IconName; label: string; screen?: string }[] = [
  { icon: 'map-pin', label: '내 주변', screen: undefined },
  { icon: 'heart', label: '찜한 매장', screen: undefined },
  { icon: 'clock', label: '최근 본', screen: undefined },
  { icon: 'calendar', label: '내 예약', screen: 'MyReservations' },
];

const RestaurantHomeScreen: React.FC = () => {
  const navigation = useTypedNavigation();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [popularRestaurants, setPopularRestaurants] = useState<Restaurant[]>([]);
  const [nearbyRestaurants, setNearbyRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRestaurants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  const loadRestaurants = async () => {
    setLoading(true);
    try {
      const params: Parameters<typeof restaurantApiService.getRestaurants>[0] = {
        limit: 10,
        sort: 'rating',
      };
      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }
      const [popularRes] = await Promise.allSettled([
        restaurantApiService.getRestaurants(params),
        loadNearby(),
      ]);
      if (popularRes.status === 'fulfilled') {
        setPopularRestaurants(popularRes.value.restaurants || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const loadNearby = async () => {
    try {
      const pos = await getCurrentPosition();
      if (!pos) return;
      const nearby = await restaurantApiService.getNearbyRestaurants(
        pos.coords.latitude,
        pos.coords.longitude,
      );
      setNearbyRestaurants(Array.isArray(nearby) ? nearby : []);
    } catch {
      /* ignore */
    }
  };

  // 플랫폼별 위치 조회 — 웹은 navigator.geolocation, 네이티브는 RN 모듈
  const getCurrentPosition = (): Promise<{
    coords: { latitude: number; longitude: number };
  } | null> =>
    new Promise((resolve) => {
      const onSuccess = (p: any) => resolve(p);
      const onError = () => resolve(null);
      const opts = { timeout: 5000 };
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(onSuccess, onError, opts);
        } else {
          resolve(null);
        }
      } else if (Geolocation) {
        Geolocation.getCurrentPosition(onSuccess, onError, opts);
      } else {
        resolve(null);
      }
    });

  const handleCardClick = useCallback(
    (id: string) => {
      // RootTabParamList에 v2 스택 스크린이 아직 없어 as any 캐스트 (MeetupDetailScreen 패턴)
      navigation.navigate('RestaurantDetail' as any, { restaurantId: id });
    },
    [navigation],
  );

  const formatRating = (rating?: number) => (rating ? rating.toFixed(1) : '-');

  // ── Skeleton Loader ──
  const renderSkeleton = () => (
    <View style={styles.skeletonWrap}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={styles.skeletonImage} />
          <View style={styles.skeletonBody}>
            <View style={[styles.skeletonLine, { height: 16, width: '60%' }]} />
            <View style={[styles.skeletonLine, { height: 13, width: '40%' }]} />
            <View style={[styles.skeletonLine, { height: 12, width: '75%' }]} />
          </View>
        </View>
      ))}
    </View>
  );

  // ── Restaurant Card ──
  const renderRestaurantCard = (restaurant: Restaurant) => (
    <TouchableOpacity
      key={restaurant.id}
      activeOpacity={0.85}
      onPress={() => handleCardClick(restaurant.id)}
      style={styles.card}
    >
      {/* Image */}
      <View style={styles.cardImageWrap}>
        {restaurant.imageUrl ? (
          <Image
            source={{ uri: restaurant.imageUrl }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Text style={styles.cardImageEmoji}>🍽️</Text>
          </View>
        )}
        {restaurant.category ? (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{restaurant.category}</Text>
          </View>
        ) : null}
      </View>

      {/* Info */}
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>
          {restaurant.name}
        </Text>
        <View style={styles.cardRatingRow}>
          <Text style={styles.cardRating}>★ {formatRating(restaurant.avgRating)}</Text>
          {restaurant.reviewCount != null && restaurant.reviewCount > 0 ? (
            <Text style={styles.cardReviewCount}>리뷰 {restaurant.reviewCount}</Text>
          ) : null}
        </View>
        {restaurant.address ? (
          <View style={styles.cardAddressRow}>
            <Icon name="map-pin" size={11} color={COLORS.text.tertiary} />
            <Text style={styles.cardAddress} numberOfLines={1}>
              {restaurant.address}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Right arrow */}
      <View style={styles.cardArrow}>
        <Icon name="chevron-right" size={16} color={COLORS.text.tertiary} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.wrapper}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>E</Text>
            </View>
            <Text style={styles.brandText}>잇테이블</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.bellButton}
            onPress={() => {
              /* 알림 화면 — RN 스크린 매핑 없음, 생략 */
            }}
          >
            <Icon name="bell" size={21} color={COLORS.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* ── Search Bar ── */}
        <View style={styles.searchBarWrap}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.searchBar}
            onPress={() => navigation.navigate('SearchRestaurants' as any)}
          >
            <Icon name="search" size={18} color={COLORS.neutral.grey400} />
            <Text style={styles.searchPlaceholder}>오늘은 어디서 먹을까?</Text>
          </TouchableOpacity>
        </View>

        {/* ── Quick Actions ── */}
        <View style={styles.quickActionWrap}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.label}
              activeOpacity={0.8}
              style={styles.quickActionItem}
              onPress={() => {
                if (action.screen) navigation.navigate(action.screen as any);
              }}
            >
              <View style={styles.quickActionIcon}>
                <Icon name={action.icon} size={20} color={COLORS.primary.main} />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Category Filter ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                activeOpacity={0.8}
                onPress={() => setSelectedCategory(cat.id)}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: isActive
                      ? COLORS.primary.main
                      : COLORS.secondary.light,
                  },
                ]}
              >
                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                <Text
                  style={[
                    styles.categoryLabel,
                    {
                      color: isActive ? '#FFFFFF' : COLORS.text.secondary,
                      fontWeight: isActive ? '600' : '500',
                    },
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Content ── */}
        {loading ? (
          renderSkeleton()
        ) : (
          <>
            {/* 인기 매장 */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>인기 매장</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.seeAll}
                  onPress={() => navigation.navigate('SearchRestaurants' as any)}
                >
                  <Text style={styles.seeAllText}>더보기</Text>
                  <Icon name="chevron-right" size={12} color={COLORS.text.tertiary} />
                </TouchableOpacity>
              </View>
              <View style={styles.cardGrid}>
                {popularRestaurants.length > 0 ? (
                  popularRestaurants.map((r) => renderRestaurantCard(r))
                ) : (
                  <View style={styles.emptyState}>
                    <View style={styles.emptyIcon}>
                      <Icon name="utensils" size={32} color={COLORS.neutral.grey300} />
                    </View>
                    <Text style={styles.emptyTitle}>아직 등록된 매장이 없어요</Text>
                    <Text style={styles.emptyDesc}>
                      곧 새로운 매장이 추가될 예정이에요!
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* 내 주변 매장 */}
            {nearbyRestaurants.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Icon name="map-pin" size={16} color={COLORS.primary.main} />
                    <Text style={[styles.sectionTitle, { marginLeft: 6 }]}>
                      내 주변 매장
                    </Text>
                  </View>
                </View>
                <View style={styles.cardGrid}>
                  {nearbyRestaurants.map((r) => renderRestaurantCard(r))}
                </View>
              </View>
            )}
          </>
        )}

        {/* 하단 여백 */}
        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ── Styles ──

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  scroll: {
    flex: 1,
  },
  container: {
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.04)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  logoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  brandText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    letterSpacing: -0.3,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarWrap: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    backgroundColor: COLORS.neutral.light,
    borderRadius: BORDER_RADIUS.pill,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.05)',
  },
  searchPlaceholder: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: COLORS.neutral.grey400,
  },
  quickActionWrap: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  quickActionItem: {
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text.secondary,
  },
  categoryScroll: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.04)',
  },
  categoryScrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    flexDirection: 'row',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BORDER_RADIUS.pill,
  },
  categoryEmoji: {
    fontSize: 13,
    marginRight: 3,
  },
  categoryLabel: {
    fontSize: 13,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    letterSpacing: -0.3,
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    marginRight: 2,
  },
  cardGrid: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_STYLE.borderColor,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  cardImageWrap: {
    width: 120,
    minHeight: 120,
  },
  cardImage: {
    width: 120,
    height: '100%',
  },
  cardImagePlaceholder: {
    width: 120,
    height: '100%',
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8F0',
  },
  cardImageEmoji: {
    fontSize: 36,
    opacity: 0.7,
  },
  categoryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  categoryBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  cardInfo: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  cardName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  cardRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  cardRating: {
    color: COLORS.primary.main,
    fontWeight: '700',
    fontSize: 13,
    marginRight: 6,
  },
  cardReviewCount: {
    color: COLORS.text.tertiary,
    fontSize: 12,
  },
  cardAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  cardAddress: {
    flex: 1,
    fontSize: 12,
    color: COLORS.text.tertiary,
    marginLeft: 3,
    lineHeight: 16,
  },
  cardArrow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 12,
    opacity: 0.3,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.neutral.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 14,
    color: COLORS.text.tertiary,
  },
  // Skeleton
  skeletonWrap: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  skeletonCard: {
    flexDirection: 'row',
    borderRadius: CARD_STYLE.borderRadius,
    borderWidth: 1,
    borderColor: CARD_STYLE.borderColor,
    backgroundColor: '#fff',
    overflow: 'hidden',
    marginBottom: 12,
  },
  skeletonImage: {
    width: 120,
    minHeight: 120,
    backgroundColor: COLORS.neutral.light,
  },
  skeletonBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  skeletonLine: {
    backgroundColor: COLORS.neutral.light,
    borderRadius: 4,
  },
});

export default RestaurantHomeScreen;
