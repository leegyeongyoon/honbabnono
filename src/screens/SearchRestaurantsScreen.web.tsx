import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, CSS_SHADOWS } from '../styles/colors';
import { BORDER_RADIUS, SPACING } from '../styles/spacing';
import { Icon } from '../components/Icon';
import restaurantApiService, { Restaurant } from '../services/restaurantApiService';

// ============================================================
// SearchRestaurantsScreen — 잇테이블 v2 매장/메뉴 검색
// ============================================================

const POPULAR_CATEGORIES = [
  { label: '샤브샤브', icon: '🫕', value: '샤브샤브' },
  { label: '고깃집', icon: '🥩', value: '고깃집' },
  { label: '전골/찜', icon: '🍲', value: '전골/찜' },
  { label: '훠궈', icon: '🥘', value: '훠궈' },
  { label: '코스요리', icon: '🍷', value: '코스요리' },
  { label: '한식', icon: '🍚', value: '한식' },
  { label: '일식', icon: '🍣', value: '일식' },
  { label: '양식', icon: '🍝', value: '양식' },
];

const RECENT_KEY = 'eattable_recent_searches';

const SearchRestaurantsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent searches
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_KEY);
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch { /* ignore */ }
    inputRef.current?.focus();
  }, []);

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

  // Search API
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

  // Debounced input handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 500);
  };

  const handleCategoryClick = (category: string) => {
    setQuery(category);
    doSearch(category);
  };

  const handleRecentClick = (keyword: string) => {
    setQuery(keyword);
    doSearch(keyword);
  };

  // ── Star display ──
  const renderRating = (rating?: number, count?: number) => {
    if (!rating) return null;
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
        <span style={{ color: COLORS.primary.main }}>★</span>
        <span style={{ fontWeight: 600, color: COLORS.text.primary }}>{rating.toFixed(1)}</span>
        {count != null && <span style={{ color: COLORS.text.tertiary }}>({count})</span>}
      </span>
    );
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span onClick={() => navigate(-1)} style={{ cursor: 'pointer', display: 'flex' }}>
          <Icon name="arrow-left" size={22} color={COLORS.text.primary} />
        </span>
        <span style={styles.headerTitle}>매장 검색</span>
        <span style={{ width: 22 }} />
      </div>

      {/* Search Bar */}
      <div style={styles.searchBarWrap}>
        <Icon name="search" size={18} color={COLORS.text.tertiary} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="매장명, 메뉴, 지역 검색"
          style={styles.searchInput}
        />
        {query && (
          <span
            onClick={() => { setQuery(''); setResults([]); setSearched(false); }}
            style={{ cursor: 'pointer', display: 'flex' }}
          >
            <Icon name="x" size={16} color={COLORS.text.tertiary} />
          </span>
        )}
      </div>

      {/* Content */}
      {!searched ? (
        <>
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div style={styles.section}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={styles.sectionTitle}>최근 검색어</span>
                <span onClick={clearAllRecent} style={styles.clearAllBtn}>전체 삭제</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
                {recentSearches.map((kw) => (
                  <div key={kw} style={styles.recentChip}>
                    <span onClick={() => handleRecentClick(kw)} style={{ cursor: 'pointer' }}>{kw}</span>
                    <span onClick={() => removeRecent(kw)} style={{ cursor: 'pointer', marginLeft: 6, color: COLORS.text.tertiary, fontSize: 12 }}>✕</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Popular Categories */}
          <div style={styles.section}>
            <span style={styles.sectionTitle}>인기 카테고리</span>
            <div style={styles.categoryGrid}>
              {POPULAR_CATEGORIES.map((cat) => (
                <div
                  key={cat.value}
                  onClick={() => handleCategoryClick(cat.value)}
                  style={styles.categoryChip}
                >
                  <span style={{ fontSize: 24 }}>{cat.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: COLORS.text.primary, marginTop: 4 }}>{cat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <ActivityIndicator size="large" color={COLORS.primary.main} />
        </div>
      ) : results.length === 0 ? (
        <div style={styles.emptyState}>
          <Icon name="search" size={48} color={COLORS.neutral.grey300} />
          <p style={{ color: COLORS.text.tertiary, fontSize: 14, margin: '12px 0 0' }}>
            '{query}'에 대한 검색 결과가 없습니다.
          </p>
        </div>
      ) : (
        <div style={{ marginTop: 8 }}>
          <p style={{ fontSize: 13, color: COLORS.text.tertiary, margin: '8px 0 12px' }}>
            검색결과 {results.length}건
          </p>
          {results.map((r) => (
            <div
              key={r.id}
              onClick={() => navigate(`/restaurant/${r.id}`)}
              style={styles.resultCard}
            >
              {r.imageUrl ? (
                <img src={r.imageUrl} alt="" style={styles.resultImage} />
              ) : (
                <div style={{ ...styles.resultImage, background: COLORS.neutral.grey100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="utensils" size={24} color={COLORS.neutral.grey300} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={styles.resultName}>{r.name}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <span style={styles.categoryBadge}>{r.category}</span>
                  {renderRating(r.avgRating, r.reviewCount)}
                </div>
                {r.address && (
                  <p style={styles.addressText}>{r.address}</p>
                )}
              </div>
              <Icon name="chevron-right" size={18} color={COLORS.text.tertiary} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Styles ──
const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 480,
    margin: '0 auto',
    padding: '0 16px 32px',
    minHeight: '100vh',
    background: COLORS.neutral.background,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    position: 'sticky' as const,
    top: 0,
    background: COLORS.neutral.white,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 600,
    color: COLORS.text.primary,
  },
  searchBarWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: COLORS.neutral.grey50,
    borderRadius: 12,
    padding: '10px 14px',
    marginTop: 4,
    border: `1px solid ${COLORS.neutral.grey100}`,
  },
  searchInput: {
    flex: 1,
    border: 'none',
    background: 'transparent',
    fontSize: 15,
    outline: 'none',
    color: COLORS.text.primary,
    fontFamily: 'inherit',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: COLORS.text.primary,
  },
  clearAllBtn: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    cursor: 'pointer',
  },
  recentChip: {
    display: 'flex',
    alignItems: 'center',
    padding: '6px 12px',
    background: COLORS.neutral.grey50,
    borderRadius: 20,
    fontSize: 13,
    color: COLORS.text.secondary,
    border: `1px solid ${COLORS.neutral.grey100}`,
  },
  categoryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 12,
    marginTop: 14,
  },
  categoryChip: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '14px 8px',
    background: COLORS.neutral.white,
    borderRadius: 12,
    border: `1px solid ${COLORS.neutral.grey100}`,
    cursor: 'pointer',
    transition: 'box-shadow 0.15s',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px 0',
  },
  resultCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    background: COLORS.neutral.white,
    borderRadius: 12,
    marginBottom: 8,
    cursor: 'pointer',
    border: `1px solid ${COLORS.neutral.grey100}`,
    transition: 'box-shadow 0.15s',
  },
  resultImage: {
    width: 64,
    height: 64,
    borderRadius: 10,
    objectFit: 'cover' as const,
    flexShrink: 0,
  },
  resultName: {
    fontSize: 15,
    fontWeight: 600,
    color: COLORS.text.primary,
    margin: 0,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  categoryBadge: {
    fontSize: 12,
    fontWeight: 500,
    color: COLORS.primary.main,
    background: COLORS.primary.light,
    padding: '2px 8px',
    borderRadius: 6,
  },
  addressText: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    margin: '4px 0 0',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
};

export default SearchRestaurantsScreen;
