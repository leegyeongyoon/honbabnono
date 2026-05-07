import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ActivityIndicator } from 'react-native';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { COLORS, CSS_SHADOWS, CARD_STYLE, TRANSITIONS } from '../styles/colors';
import { BORDER_RADIUS, SPACING, HEADER_STYLE } from '../styles/spacing';
import { Icon } from '../components/Icon';
import restaurantApiService, { Restaurant } from '../services/restaurantApiService';

// ============================================================
// SearchRestaurantsScreen — 잇테이블 v2 매장/메뉴 검색
// 홈 화면과 통일된 디자인 시스템 적용
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

const TRENDING_KEYWORDS = ['샤브샤브', '고깃집', '회식', '데이트', '가성비', '코스요리'];
const RECENT_KEY = 'eattable_recent_searches';

const SearchRestaurantsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Restaurant[]>([]);
  const [recentViews, setRecentViews] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load initial data
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_KEY);
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch { /* ignore */ }

    // URL 쿼리 파라미터로 검색어가 있으면 바로 검색
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      doSearch(q);
    } else {
      inputRef.current?.focus();
    }

    loadRecentViews();
  }, []);

  const loadRecentViews = async () => {
    try {
      const views = await restaurantApiService.getRecentViews();
      setRecentViews(Array.isArray(views) ? views.slice(0, 5) : []);
    } catch { /* ignore */ }
  };

  const saveRecentSearch = (keyword: string) => {
    const trimmed = keyword.trim();
    if (!trimmed) return;
    const updated = [trimmed, ...recentSearches.filter((s) => s !== trimmed)].slice(0, 10);
    setRecentSearches(updated);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  };

  const removeRecent = (keyword: string) => {
    const updated = recentSearches.filter((s) => s !== keyword);
    setRecentSearches(updated);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  };

  const clearAllRecent = () => {
    setRecentSearches([]);
    try { localStorage.removeItem(RECENT_KEY); } catch { /* ignore */ }
  };

  const doSearch = useCallback(async (keyword: string) => {
    const trimmed = keyword.trim();
    if (!trimmed) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const list = await restaurantApiService.searchRestaurants(trimmed);
      setResults(Array.isArray(list) ? list : []);
      saveRecentSearch(trimmed);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [recentSearches]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      doSearch(query);
    }
  };

  const handleCategoryClick = (catId: string) => {
    setSelectedCategory(catId);
    if (catId === 'all') {
      setQuery('');
      setResults([]);
      setSearched(false);
    } else {
      const cat = CATEGORIES.find(c => c.id === catId);
      if (cat) {
        setQuery(cat.label);
        doSearch(cat.label);
      }
    }
  };

  const handleRecentClick = (keyword: string) => {
    setQuery(keyword);
    doSearch(keyword);
  };

  const handleCardClick = (id: string) => {
    navigate(`/restaurant/${id}`);
  };

  const clearQuery = () => {
    setQuery('');
    setResults([]);
    setSearched(false);
    setSelectedCategory('all');
    inputRef.current?.focus();
  };

  const formatRating = (rating?: number) => rating ? rating.toFixed(1) : '-';

  // ── Restaurant Card (홈과 동일 스타일) ──
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
        }}
      >
        <div style={cardStyles.imageWrapper}>
          {restaurant.imageUrl ? (
            <img src={restaurant.imageUrl} alt={restaurant.name} style={cardStyles.image} />
          ) : (
            <div style={cardStyles.imagePlaceholder}>
              <span style={{ fontSize: 32 }}>🍽️</span>
            </div>
          )}
          {restaurant.category && (
            <div style={cardStyles.categoryBadge}>{restaurant.category}</div>
          )}
        </div>
        <div style={cardStyles.info}>
          <div style={cardStyles.name}>{restaurant.name}</div>
          <div style={cardStyles.meta}>
            <span style={cardStyles.rating}>★ {formatRating(restaurant.avgRating)}</span>
            {restaurant.reviewCount != null && (
              <span style={cardStyles.reviewCount}>리뷰 {restaurant.reviewCount}</span>
            )}
          </div>
          {restaurant.address && (
            <div style={cardStyles.address}>{restaurant.address}</div>
          )}
        </div>
      </div>
    );
  };

  // ── 최근 본 매장 (가로 스크롤) ──
  const renderRecentViewCard = (restaurant: Restaurant) => (
    <div
      key={restaurant.id}
      onClick={() => handleCardClick(restaurant.id)}
      style={recentViewStyles.card}
    >
      <div style={recentViewStyles.imageWrap}>
        {restaurant.imageUrl ? (
          <img src={restaurant.imageUrl} alt={restaurant.name} style={recentViewStyles.image} />
        ) : (
          <div style={recentViewStyles.imagePlaceholder}>
            <span style={{ fontSize: 20 }}>🍽️</span>
          </div>
        )}
      </div>
      <div style={recentViewStyles.name}>{restaurant.name}</div>
      {restaurant.category && (
        <div style={recentViewStyles.category}>{restaurant.category}</div>
      )}
    </div>
  );

  return (
    <div style={pageStyles.wrapper}>
      <div style={pageStyles.container}>
        {/* 헤더 — sticky */}
        <div style={pageStyles.header}>
          <div style={pageStyles.headerInner}>
            <span onClick={() => navigate(-1)} style={pageStyles.backBtn}>
              <Icon name="arrow-left" size={22} color={COLORS.text.primary} />
            </span>
            <div style={pageStyles.searchBar}>
              <Icon name="search" size={18} color={COLORS.neutral.grey400} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="매장명, 메뉴, 지역 검색"
                style={pageStyles.searchInput}
              />
              {query && (
                <span onClick={clearQuery} style={pageStyles.clearBtn}>
                  <Icon name="x" size={16} color={COLORS.text.tertiary} />
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 카테고리 필터 — 가로 스크롤 pill */}
        <div style={pageStyles.categoryScroll}>
          {CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              style={{
                ...pageStyles.categoryChip,
                backgroundColor: selectedCategory === cat.id
                  ? COLORS.primary.main
                  : COLORS.secondary.light,
                color: selectedCategory === cat.id
                  ? '#FFFFFF'
                  : COLORS.text.secondary,
              }}
            >
              <span style={{ marginRight: 4 }}>{cat.emoji}</span>
              {cat.label}
            </div>
          ))}
        </div>

        {/* 콘텐츠 영역 */}
        <div style={pageStyles.content}>
          {!searched ? (
            <>
              {/* 최근 검색어 */}
              {recentSearches.length > 0 && (
                <div style={pageStyles.section}>
                  <div style={pageStyles.sectionHeader}>
                    <div style={pageStyles.sectionTitle}>최근 검색어</div>
                    <div onClick={clearAllRecent} style={pageStyles.seeAll}>전체 삭제</div>
                  </div>
                  <div style={pageStyles.chipWrap}>
                    {recentSearches.map((kw) => (
                      <div key={kw} style={pageStyles.recentChip}>
                        <span onClick={() => handleRecentClick(kw)} style={{ cursor: 'pointer' }}>
                          <Icon name="clock" size={13} color={COLORS.text.tertiary} />
                        </span>
                        <span
                          onClick={() => handleRecentClick(kw)}
                          style={{ cursor: 'pointer', flex: 1 }}
                        >
                          {kw}
                        </span>
                        <span onClick={() => removeRecent(kw)} style={pageStyles.removeBtn}>
                          <Icon name="x" size={12} color={COLORS.text.tertiary} />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 인기 검색어 */}
              <div style={pageStyles.section}>
                <div style={pageStyles.sectionHeader}>
                  <div style={pageStyles.sectionTitle}>인기 검색어</div>
                </div>
                <div style={pageStyles.trendingWrap}>
                  {TRENDING_KEYWORDS.map((kw, idx) => (
                    <div
                      key={kw}
                      onClick={() => handleRecentClick(kw)}
                      style={pageStyles.trendingChip}
                    >
                      <span style={pageStyles.trendingRank}>{idx + 1}</span>
                      <span style={pageStyles.trendingLabel}>{kw}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 최근 본 매장 */}
              {recentViews.length > 0 && (
                <div style={pageStyles.section}>
                  <div style={pageStyles.sectionHeader}>
                    <div style={pageStyles.sectionTitle}>최근 본 매장</div>
                  </div>
                  <div style={pageStyles.recentViewScroll}>
                    {recentViews.map(renderRecentViewCard)}
                  </div>
                </div>
              )}
            </>
          ) : loading ? (
            <div style={pageStyles.loadingWrap}>
              <ActivityIndicator size="large" color={COLORS.primary.main} />
            </div>
          ) : results.length === 0 ? (
            <div style={pageStyles.emptyState}>
              <div style={pageStyles.emptyIcon}>
                <Icon name="search" size={40} color={COLORS.neutral.grey300} />
              </div>
              <div style={pageStyles.emptyTitle}>검색 결과가 없어요</div>
              <div style={pageStyles.emptyDesc}>
                '{query}'에 대한 매장을 찾을 수 없어요.{'\n'}다른 키워드로 검색해보세요.
              </div>
            </div>
          ) : (
            <div style={pageStyles.section}>
              <div style={pageStyles.sectionHeader}>
                <div style={pageStyles.sectionTitle}>
                  검색결과
                  <span style={pageStyles.resultCount}>{results.length}</span>
                </div>
              </div>
              <div style={pageStyles.cardGrid}>
                {results.map(renderRestaurantCard)}
              </div>
            </div>
          )}
        </div>

        {/* 하단 여백 (탭바 간격) */}
        <div style={{ height: 80 }} />
      </div>
    </div>
  );
};

// ── Page Styles (홈 화면 디자인 시스템과 통일) ──

const FONT_FAMILY = '"Pretendard Variable", Pretendard, system-ui, -apple-system, sans-serif';

const pageStyles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: '100vh',
    backgroundColor: COLORS.neutral.background,
  },
  container: {
    maxWidth: 480,
    margin: '0 auto',
  },
  header: {
    position: 'sticky' as const,
    top: 0,
    zIndex: 10,
    backgroundColor: '#FFFFFF',
    borderBottom: `1px solid rgba(17,17,17,0.06)`,
    padding: '12px 20px',
  },
  headerInner: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: '50%',
    cursor: 'pointer',
    flexShrink: 0,
    transition: TRANSITIONS.fast,
  },
  searchBar: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
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
    fontFamily: FONT_FAMILY,
  } as any,
  clearBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 2,
  },
  categoryScroll: {
    display: 'flex',
    gap: 8,
    padding: '12px 20px',
    overflowX: 'auto' as const,
    backgroundColor: '#FFFFFF',
    WebkitOverflowScrolling: 'touch',
  },
  categoryChip: {
    flexShrink: 0,
    padding: '6px 14px',
    borderRadius: BORDER_RADIUS.pill,
    fontSize: 13,
    fontWeight: 500,
    whiteSpace: 'nowrap' as const,
    transition: `all ${TRANSITIONS.normal}`,
    fontFamily: FONT_FAMILY,
    cursor: 'pointer',
  },
  content: {
    paddingBottom: 20,
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
    fontFamily: FONT_FAMILY,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  seeAll: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    cursor: 'pointer',
    fontFamily: FONT_FAMILY,
  },
  resultCount: {
    fontSize: 14,
    fontWeight: 500,
    color: COLORS.primary.main,
    marginLeft: 6,
  },

  // 최근 검색어
  chipWrap: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 2,
  },
  recentChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 0',
    fontSize: 14,
    color: COLORS.text.primary,
    fontFamily: FONT_FAMILY,
    borderBottom: `1px solid rgba(17,17,17,0.04)`,
    cursor: 'pointer',
  },
  removeBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    cursor: 'pointer',
  },

  // 인기 검색어
  trendingWrap: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 0,
  },
  trendingChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '13px 4px',
    cursor: 'pointer',
    fontFamily: FONT_FAMILY,
    borderBottom: `1px solid rgba(17,17,17,0.04)`,
  },
  trendingRank: {
    fontSize: 14,
    fontWeight: 700,
    color: COLORS.primary.main,
    width: 20,
    textAlign: 'center' as const,
  },
  trendingLabel: {
    fontSize: 14,
    fontWeight: 500,
    color: COLORS.text.primary,
  },

  // 최근 본 매장
  recentViewScroll: {
    display: 'flex',
    gap: 12,
    overflowX: 'auto' as const,
    paddingBottom: 4,
    WebkitOverflowScrolling: 'touch',
  },

  // 검색 결과
  cardGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
  },

  // 로딩/빈 상태
  loadingWrap: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px 20px',
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
    fontFamily: FONT_FAMILY,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    fontFamily: FONT_FAMILY,
    textAlign: 'center' as const,
    lineHeight: 1.5,
    whiteSpace: 'pre-line' as const,
  },
};

// ── Card Styles (홈 화면 cardStyles와 동일) ──

const cardStyles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'row' as const,
    borderRadius: CARD_STYLE.borderRadius,
    border: `1px solid ${CARD_STYLE.borderColor}`,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    transition: `all ${TRANSITIONS.normal}`,
    cursor: 'pointer',
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
    fontFamily: FONT_FAMILY,
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
    fontFamily: FONT_FAMILY,
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    fontFamily: FONT_FAMILY,
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
    fontFamily: FONT_FAMILY,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
};

// ── Recent View Card Styles (가로 스크롤) ──

const recentViewStyles: Record<string, React.CSSProperties> = {
  card: {
    flexShrink: 0,
    width: 120,
    cursor: 'pointer',
  },
  imageWrap: {
    width: 120,
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 6,
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
  name: {
    fontSize: 13,
    fontWeight: 600,
    color: COLORS.text.primary,
    fontFamily: FONT_FAMILY,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  category: {
    fontSize: 11,
    color: COLORS.text.tertiary,
    fontFamily: FONT_FAMILY,
    marginTop: 2,
  },
};

export default SearchRestaurantsScreen;
