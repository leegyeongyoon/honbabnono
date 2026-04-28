import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { COLORS, CSS_SHADOWS, CARD_STYLE, LAYOUT } from '../styles/colors';
import { SPACING, BORDER_RADIUS, HEADER_STYLE } from '../styles/spacing';
import restaurantApiService, { Restaurant } from '../services/restaurantApiService';

// ============================================================
// RestaurantHomeScreen — 잇테이블 v2 매장 추천 홈
// ============================================================

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

const RestaurantHomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [popularRestaurants, setPopularRestaurants] = useState<Restaurant[]>([]);
  const [nearbyRestaurants, setNearbyRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  useEffect(() => {
    loadRestaurants();
  }, [selectedCategory]);

  const loadRestaurants = async () => {
    setLoading(true);
    try {
      const params = selectedCategory !== 'all' ? { category: selectedCategory } : undefined;
      const [popularRes, nearbyRes] = await Promise.allSettled([
        restaurantApiService.getRestaurants({ ...params, limit: 10 }),
        loadNearby(),
      ]);
      if (popularRes.status === 'fulfilled') {
        const data = popularRes.value;
        setPopularRestaurants(Array.isArray(data) ? data : data.restaurants || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const loadNearby = async () => {
    try {
      if ('geolocation' in navigator) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 }),
        );
        const nearby = await restaurantApiService.getNearbyRestaurants(
          pos.coords.latitude,
          pos.coords.longitude,
        );
        setNearbyRestaurants(Array.isArray(nearby) ? nearby : []);
      }
    } catch {
      // 위치 권한 없으면 무시
    }
  };

  const handleSearchSubmit = useCallback(() => {
    if (searchQuery.trim()) {
      navigate(`/search-restaurants?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  }, [searchQuery, navigate]);

  const handleCardClick = useCallback((id: string) => {
    navigate(`/restaurant/${id}`);
  }, [navigate]);

  const formatRating = (rating?: number) => rating ? rating.toFixed(1) : '-';
  const formatPrice = (n: number) => n.toLocaleString('ko-KR');

  // ── 렌더 ──

  const renderRestaurantCard = (restaurant: Restaurant) => {
    const isHovered = hoveredCardId === restaurant.id;
    return (
      <div
        key={restaurant.id}
        onClick={() => handleCardClick(restaurant.id)}
        onMouseEnter={() => setHoveredCardId(restaurant.id)}
        onMouseLeave={() => setHoveredCardId(null)}
        style={{
          ...cardStyles.container,
          boxShadow: isHovered ? CSS_SHADOWS.cardHover : CSS_SHADOWS.card,
          transform: isHovered ? 'translateY(-2px)' : 'none',
          cursor: 'pointer',
        }}
      >
        {/* 이미지 */}
        <div style={cardStyles.imageWrapper}>
          {restaurant.imageUrl ? (
            <img
              src={restaurant.imageUrl}
              alt={restaurant.name}
              style={cardStyles.image}
            />
          ) : (
            <div style={cardStyles.imagePlaceholder}>
              <span style={{ fontSize: 32 }}>🍽️</span>
            </div>
          )}
          {restaurant.category && (
            <div style={cardStyles.categoryBadge}>{restaurant.category}</div>
          )}
        </div>

        {/* 정보 */}
        <div style={cardStyles.info}>
          <div style={cardStyles.name}>{restaurant.name}</div>
          <div style={cardStyles.meta}>
            <span style={cardStyles.rating}>
              ★ {formatRating(restaurant.avgRating)}
            </span>
            {restaurant.reviewCount != null && (
              <span style={cardStyles.reviewCount}>
                리뷰 {restaurant.reviewCount}
              </span>
            )}
          </div>
          {restaurant.address && (
            <div style={cardStyles.address}>{restaurant.address}</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={pageStyles.wrapper}>
      <div style={pageStyles.container}>
        {/* 헤더 */}
        <div style={pageStyles.header}>
          <div style={pageStyles.headerTitle}>잇테이블</div>
          <TouchableOpacity onPress={() => navigate('/notifications')}>
            <Icon name="bell" size={22} color={COLORS.text.secondary} />
          </TouchableOpacity>
        </div>

        {/* 검색바 */}
        <div style={pageStyles.searchBar}>
          <Icon name="search" size={18} color={COLORS.neutral.grey400} />
          <input
            type="text"
            placeholder="매장명, 카테고리 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
            style={pageStyles.searchInput}
          />
        </div>

        {/* 카테고리 필터 */}
        <div style={pageStyles.categoryScroll}>
          {CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                ...pageStyles.categoryChip,
                backgroundColor: selectedCategory === cat.id
                  ? COLORS.primary.main
                  : COLORS.secondary.light,
                color: selectedCategory === cat.id
                  ? '#FFFFFF'
                  : COLORS.text.secondary,
                cursor: 'pointer',
              }}
            >
              <span style={{ marginRight: 4 }}>{cat.emoji}</span>
              {cat.label}
            </div>
          ))}
        </div>

        {loading ? (
          <div style={pageStyles.loadingWrap}>
            <ActivityIndicator size="large" color={COLORS.primary.main} />
          </div>
        ) : (
          <>
            {/* 인기 매장 */}
            <div style={pageStyles.section}>
              <div style={pageStyles.sectionHeader}>
                <div style={pageStyles.sectionTitle}>인기 매장</div>
                <div
                  onClick={() => navigate('/search-restaurants?sort=popular')}
                  style={pageStyles.seeAll}
                >
                  더보기
                </div>
              </div>
              <div style={pageStyles.cardGrid}>
                {popularRestaurants.length > 0 ? (
                  popularRestaurants.map(renderRestaurantCard)
                ) : (
                  <div style={pageStyles.emptyText}>매장 정보를 불러오는 중...</div>
                )}
              </div>
            </div>

            {/* 내 주변 매장 */}
            {nearbyRestaurants.length > 0 && (
              <div style={pageStyles.section}>
                <div style={pageStyles.sectionHeader}>
                  <div style={pageStyles.sectionTitle}>내 주변 매장</div>
                </div>
                <div style={pageStyles.cardGrid}>
                  {nearbyRestaurants.map(renderRestaurantCard)}
                </div>
              </div>
            )}
          </>
        )}

        {/* 하단 여백 */}
        <div style={{ height: 80 }} />
      </div>
    </div>
  );
};

// ── Styles ──

const pageStyles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: '100vh',
    backgroundColor: COLORS.neutral.background,
  },
  container: {
    maxWidth: 480,
    margin: '0 auto',
    paddingBottom: 20,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px 12px',
    backgroundColor: '#FFFFFF',
    borderBottom: `1px solid rgba(17,17,17,0.06)`,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: -0.3,
    color: COLORS.text.primary,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    margin: '12px 20px 0',
    padding: '10px 14px',
    backgroundColor: COLORS.neutral.light,
    borderRadius: BORDER_RADIUS.pill,
    border: '1px solid rgba(17,17,17,0.06)',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    fontSize: 14,
    color: COLORS.text.primary,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  } as any,
  categoryScroll: {
    display: 'flex',
    gap: 8,
    padding: '12px 20px',
    overflowX: 'auto' as const,
    WebkitOverflowScrolling: 'touch',
  },
  categoryChip: {
    flexShrink: 0,
    padding: '6px 14px',
    borderRadius: BORDER_RADIUS.pill,
    fontSize: 13,
    fontWeight: 500,
    whiteSpace: 'nowrap' as const,
    transition: 'all 200ms ease-out',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  section: {
    marginTop: 24,
    paddingLeft: 20,
    paddingRight: 20,
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 700,
    color: COLORS.text.primary,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  seeAll: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    cursor: 'pointer',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  cardGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
  },
  loadingWrap: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    textAlign: 'center' as const,
    padding: 32,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
};

const cardStyles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'row' as const,
    borderRadius: CARD_STYLE.borderRadius,
    border: `1px solid ${CARD_STYLE.borderColor}`,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    transition: 'all 200ms ease-out',
  },
  imageWrapper: {
    position: 'relative' as const,
    width: 110,
    minHeight: 110,
    flexShrink: 0,
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.neutral.light,
  },
  categoryBadge: {
    position: 'absolute' as const,
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 4,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  info: {
    flex: 1,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: 600,
    color: COLORS.text.primary,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  rating: {
    color: COLORS.primary.main,
    fontWeight: 600,
  },
  reviewCount: {
    color: COLORS.text.tertiary,
  },
  address: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    marginTop: 2,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
};

export default RestaurantHomeScreen;
