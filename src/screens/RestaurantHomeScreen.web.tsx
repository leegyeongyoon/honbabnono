import React, { useState, useEffect, useCallback } from 'react';
import { ActivityIndicator } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { Icon, IconName } from '../components/Icon';
import { COLORS, CSS_SHADOWS, CARD_STYLE, TRANSITIONS } from '../styles/colors';
import { SPACING, BORDER_RADIUS } from '../styles/spacing';
import restaurantApiService, { Restaurant } from '../services/restaurantApiService';

// ============================================================
// RestaurantHomeScreen — 잇테이블 v2 프로덕션 홈
// ============================================================

const FONT = '"Pretendard Variable", Pretendard, system-ui, -apple-system, sans-serif';

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

const QUICK_ACTIONS: { icon: IconName; label: string; path: string }[] = [
  { icon: 'map-pin', label: '내 주변', path: '/explore' },
  { icon: 'heart', label: '찜한 매장', path: '/wishlist' },
  { icon: 'clock', label: '최근 본', path: '/recent-views' },
  { icon: 'calendar', label: '내 예약', path: '/my-reservations' },
];

const RestaurantHomeScreen: React.FC = () => {
  const navigate = useNavigate();
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
      const [popularRes] = await Promise.allSettled([
        restaurantApiService.getRestaurants({ ...params, limit: 10 }),
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
    } catch { /* ignore */ }
  };

  const handleCardClick = useCallback((id: string) => {
    navigate(`/restaurant/${id}`);
  }, [navigate]);

  const formatRating = (rating?: number) => rating ? rating.toFixed(1) : '-';

  // ── Skeleton Loader ──
  const renderSkeleton = () => (
    <div style={{ padding: '0 20px' }}>
      {[0, 1, 2].map((i) => (
        <div key={i} className="card-hover" style={{
          display: 'flex', borderRadius: CARD_STYLE.borderRadius,
          border: `1px solid ${CARD_STYLE.borderColor}`, backgroundColor: '#fff',
          overflow: 'hidden', marginBottom: 12,
        }}>
          <div className="skeleton" style={{ width: 120, minHeight: 120, borderRadius: 0 }} />
          <div style={{ flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="skeleton" style={{ height: 16, width: '60%' }} />
            <div className="skeleton" style={{ height: 13, width: '40%' }} />
            <div className="skeleton" style={{ height: 12, width: '75%' }} />
          </div>
        </div>
      ))}
    </div>
  );

  // ── Restaurant Card ──
  const renderRestaurantCard = (restaurant: Restaurant, index: number) => {
    const isHovered = hoveredCardId === restaurant.id;
    return (
      <div
        key={restaurant.id}
        className="card-hover"
        onClick={() => handleCardClick(restaurant.id)}
        onMouseEnter={() => setHoveredCardId(restaurant.id)}
        onMouseLeave={() => setHoveredCardId(null)}
        style={{
          display: 'flex',
          borderRadius: 12,
          border: `1px solid ${CARD_STYLE.borderColor}`,
          backgroundColor: '#FFFFFF',
          overflow: 'hidden',
          cursor: 'pointer',
          animationDelay: `${index * 60}ms`,
        }}
      >
        {/* Image */}
        <div style={{ position: 'relative', width: 120, minHeight: 120, flexShrink: 0 }}>
          {restaurant.imageUrl ? (
            <img
              src={restaurant.imageUrl}
              alt={restaurant.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              loading="lazy"
            />
          ) : (
            <div style={{
              width: '100%', height: '100%', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, #FFF8F0 0%, #F5F5F5 100%)',
            }}>
              <span style={{ fontSize: 36, opacity: 0.7 }}>🍽️</span>
            </div>
          )}
          {restaurant.category && (
            <div style={{
              position: 'absolute', top: 8, left: 8,
              backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              color: '#fff', fontSize: 11, fontWeight: 600,
              padding: '3px 8px', borderRadius: 4, fontFamily: FONT,
            }}>
              {restaurant.category}
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
          <div style={{
            fontSize: 15, fontWeight: 600, color: COLORS.text.primary,
            fontFamily: FONT, lineHeight: '20px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {restaurant.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              color: COLORS.primary.main, fontWeight: 700, fontSize: 13, fontFamily: FONT,
            }}>
              ★ {formatRating(restaurant.avgRating)}
            </span>
            {restaurant.reviewCount != null && restaurant.reviewCount > 0 && (
              <span style={{ color: COLORS.text.tertiary, fontSize: 12, fontFamily: FONT }}>
                리뷰 {restaurant.reviewCount}
              </span>
            )}
          </div>
          {restaurant.address && (
            <div style={{
              fontSize: 12, color: COLORS.text.tertiary, fontFamily: FONT,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              lineHeight: '16px', marginTop: 2,
            }}>
              <Icon name="map-pin" size={11} color={COLORS.text.tertiary} />
              <span style={{ marginLeft: 3 }}>{restaurant.address}</span>
            </div>
          )}
        </div>

        {/* Right arrow */}
        <div style={{
          display: 'flex', alignItems: 'center', paddingRight: 12, flexShrink: 0,
          opacity: isHovered ? 0.6 : 0.3, transition: 'opacity 200ms',
        }}>
          <Icon name="chevron-right" size={16} color={COLORS.text.tertiary} />
        </div>
      </div>
    );
  };

  return (
    <div style={S.wrapper}>
      <div style={S.container}>
        {/* ── Header ── */}
        <div style={S.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: `linear-gradient(135deg, ${COLORS.primary.main}, ${COLORS.primary.dark})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(255,165,41,0.25)',
            }}>
              <span style={{ color: '#fff', fontSize: 14, fontWeight: 800, fontFamily: FONT }}>E</span>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.text.primary, fontFamily: FONT, letterSpacing: -0.3 }}>
                잇테이블
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={() => navigate('/notifications')}
              className="btn-press"
              style={{
                width: 40, height: 40, borderRadius: 20, border: 'none',
                background: 'transparent', display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', position: 'relative',
              }}
            >
              <Icon name="bell" size={21} color={COLORS.text.secondary} />
            </button>
          </div>
        </div>

        {/* ── Search Bar ── */}
        <div style={S.searchBarWrap}>
          <div
            onClick={() => navigate('/search-restaurants')}
            className="btn-press"
            style={S.searchBar}
          >
            <Icon name="search" size={18} color={COLORS.neutral.grey400} />
            <span style={{
              flex: 1, fontSize: 14, color: COLORS.neutral.grey400, fontFamily: FONT,
            }}>
              오늘은 어디서 먹을까?
            </span>
          </div>
        </div>

        {/* ── Quick Actions ── */}
        <div style={S.quickActionWrap}>
          {QUICK_ACTIONS.map((action) => (
            <div
              key={action.label}
              onClick={() => navigate(action.path)}
              className="btn-press"
              style={S.quickActionItem}
            >
              <div style={S.quickActionIcon}>
                <Icon name={action.icon} size={20} color={COLORS.primary.main} />
              </div>
              <span style={S.quickActionLabel}>{action.label}</span>
            </div>
          ))}
        </div>

        {/* ── Category Filter ── */}
        <div style={S.categoryScroll}>
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <div
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className="btn-press"
                style={{
                  ...S.categoryChip,
                  backgroundColor: isActive ? COLORS.primary.main : COLORS.secondary.light,
                  color: isActive ? '#FFFFFF' : COLORS.text.secondary,
                  fontWeight: isActive ? 600 : 500,
                  boxShadow: isActive ? '0 2px 8px rgba(255,165,41,0.25)' : 'none',
                }}
              >
                <span style={{ marginRight: 3, fontSize: 13 }}>{cat.emoji}</span>
                {cat.label}
              </div>
            );
          })}
        </div>

        {/* ── Content ── */}
        {loading ? renderSkeleton() : (
          <>
            {/* 인기 매장 */}
            <div style={S.section}>
              <div style={S.sectionHeader}>
                <div style={S.sectionTitle}>인기 매장</div>
                <div onClick={() => navigate('/search-restaurants?sort=popular')} style={S.seeAll} className="btn-press">
                  더보기 <Icon name="chevron-right" size={12} color={COLORS.text.tertiary} />
                </div>
              </div>
              <div style={S.cardGrid}>
                {popularRestaurants.length > 0 ? (
                  popularRestaurants.map((r, i) => renderRestaurantCard(r, i))
                ) : (
                  <div style={S.emptyState}>
                    <div style={S.emptyIcon}>
                      <Icon name="utensils" size={32} color={COLORS.neutral.grey300} />
                    </div>
                    <div style={S.emptyTitle}>아직 등록된 매장이 없어요</div>
                    <div style={S.emptyDesc}>곧 새로운 매장이 추가될 예정이에요!</div>
                  </div>
                )}
              </div>
            </div>

            {/* 내 주변 매장 */}
            {nearbyRestaurants.length > 0 && (
              <div style={S.section}>
                <div style={S.sectionHeader}>
                  <div style={S.sectionTitle}>
                    <Icon name="map-pin" size={16} color={COLORS.primary.main} />
                    <span style={{ marginLeft: 6 }}>내 주변 매장</span>
                  </div>
                </div>
                <div style={S.cardGrid}>
                  {nearbyRestaurants.map((r, i) => renderRestaurantCard(r, i))}
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

const S: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: '100vh',
    backgroundColor: COLORS.neutral.background,
  },
  container: {
    maxWidth: 480,
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 20px 10px',
    backgroundColor: '#FFFFFF',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    borderBottom: `1px solid rgba(17,17,17,0.04)`,
  },
  searchBarWrap: {
    padding: '8px 20px 4px',
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '11px 16px',
    backgroundColor: COLORS.neutral.light,
    borderRadius: BORDER_RADIUS.pill,
    border: '1px solid rgba(17,17,17,0.05)',
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.normal}`,
  },
  quickActionWrap: {
    display: 'flex',
    justifyContent: 'space-around',
    padding: '16px 20px 8px',
    backgroundColor: '#FFFFFF',
  },
  quickActionItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    cursor: 'pointer',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.primary.light,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: `transform ${TRANSITIONS.normal}`,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: COLORS.text.secondary,
    fontFamily: FONT,
  },
  categoryScroll: {
    display: 'flex',
    gap: 8,
    padding: '12px 20px',
    overflowX: 'auto',
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid rgba(17,17,17,0.04)',
  },
  categoryChip: {
    flexShrink: 0,
    padding: '7px 14px',
    borderRadius: BORDER_RADIUS.pill,
    fontSize: 13,
    whiteSpace: 'nowrap',
    transition: `all ${TRANSITIONS.normal}`,
    fontFamily: FONT,
    cursor: 'pointer',
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
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: COLORS.text.primary,
    fontFamily: FONT,
    letterSpacing: -0.3,
    display: 'flex',
    alignItems: 'center',
  },
  seeAll: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    cursor: 'pointer',
    fontFamily: FONT,
    display: 'flex',
    alignItems: 'center',
    gap: 2,
  },
  cardGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '48px 20px',
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: '50%',
    backgroundColor: COLORS.neutral.light,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: COLORS.text.primary,
    fontFamily: FONT,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    fontFamily: FONT,
  },
};

export default RestaurantHomeScreen;
