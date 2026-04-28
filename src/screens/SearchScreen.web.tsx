import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useNavigate } from 'react-router-dom';
import { CSS_SHADOWS } from '../styles/colors';
import { Icon } from '../components/Icon';
import EmptyState from '../components/EmptyState';
import { useMeetups } from '../hooks/useMeetups';
import { SEARCH_CATEGORIES, SEARCH_LOCATIONS, SORT_OPTION_NAMES } from '../constants/categories';
import { formatKoreanDateTime } from '../utils/dateUtils';
import aiSearchService from '../services/aiSearchService';
import riceCharacterImage from '../assets/images/rice-character.png';
import { getAvatarColor, getInitials } from '../utils/avatarColor';

interface SearchScreenProps {
  navigation?: any;
  user?: any;
}

const SearchScreen: React.FC<SearchScreenProps> = ({ navigation, user }) => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [selectedTab, setSelectedTab] = useState<string>('전체');
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [selectedLocation, setSelectedLocation] = useState('전체');
  const [selectedSort, setSelectedSort] = useState('최신순');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchIntent, setSearchIntent] = useState<any>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchInputFocused, setSearchInputFocused] = useState(false);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  const { meetups, searchMeetups, loading } = useMeetups();

  const tabs = ['전체', '모집중', '마감'];

  const categories = SEARCH_CATEGORIES;
  const locations = SEARCH_LOCATIONS;
  const sortOptions = SORT_OPTION_NAMES;

  // 실제 검색 수행
  const performSearch = async (searchText: string, category: string = selectedCategory, location: string = selectedLocation) => {
    try {
      await searchMeetups({
        search: searchText || undefined,
        category: category !== '전체' ? category : undefined,
        location: location !== '전체' ? location : undefined,
        limit: 50
      });
    } catch (error) {
      // silently handle error
    }
  };

  // AI 검색 분석
  const handleSearchAnalysis = async (text: string) => {
    if (text.length > 2 && aiSearchService.isAIEnabled()) {
      setIsAnalyzing(true);
      try {
        const analysis = await aiSearchService.analyzeSearchIntent(text);
        setSearchIntent(analysis.intent);

        const recommendations = await aiSearchService.generateRecommendations(text, meetups);
        setSuggestions(recommendations);
        setShowSuggestions(true);

        // AI 분석 결과로 필터 자동 설정
        if (analysis.intent.category) {
          setSelectedCategory(analysis.intent.category);
        }
        if (analysis.intent.location) {
          const locationMatch = SEARCH_LOCATIONS.find(loc =>
            loc.includes(analysis.intent.location)
          );
          if (locationMatch) {
            setSelectedLocation(locationMatch);
          }
        }

        // 검색 수행
        performSearch(text, analysis.intent.category || selectedCategory, analysis.intent.location || selectedLocation);
      } catch (error) {
        // AI 오류 시에도 기본 검색 수행
        performSearch(text);
      } finally {
        setIsAnalyzing(false);
      }
    } else {
      setShowSuggestions(false);
      // 짧은 검색어이나 AI 비활성화 시 기본 검색
      if (text.length > 0) {
        performSearch(text);
      }
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchText) {
        handleSearchAnalysis(searchText);
      } else {
        // 검색어 비운 경우 전체 목록 로드
        performSearch('');
      }
    }, 500); // 디바운싱

    return () => clearTimeout(timeoutId);
  }, [searchText]);

  // 필터 변경 시 검색 재실행
  useEffect(() => {
    if (selectedCategory !== '전체' || selectedLocation !== '전체') {
      performSearch(searchText);
    }
  }, [selectedCategory, selectedLocation]);

  const filteredMeetups = meetups.filter(meetup => {
    const matchesSearch = searchText === '' ||
                         (meetup.title || '').toLowerCase().includes(searchText.toLowerCase()) ||
                         (meetup.location || '').toLowerCase().includes(searchText.toLowerCase()) ||
                         meetup.description?.toLowerCase().includes(searchText.toLowerCase());
    const matchesCategory = selectedCategory === '전체' || meetup.category === selectedCategory;
    const matchesLocation = selectedLocation === '전체' || (meetup.location || '').includes(selectedLocation.replace('구', ''));

    // 탭 필터링
    const isFull = (meetup.currentParticipants ?? 0) >= (meetup.maxParticipants ?? 4);
    const matchesTab = selectedTab === '전체' ||
      (selectedTab === '모집중' && !isFull) ||
      (selectedTab === '마감' && isFull);

    return matchesSearch && matchesCategory && matchesLocation && matchesTab;
  });

  // Compact card item matching HomeScreen pattern
  const renderMeetupItem = (meetup: any, index: number) => {
    const isFull = (meetup.currentParticipants ?? 0) >= (meetup.maxParticipants ?? 4);
    const isHovered = hoveredCardId === meetup.id;
    const categoryLabel = meetup.category || '기타';
    const locationLabel = meetup.location || '장소 미정';

    // Build a placeholder image with host avatar color
    const avatarBg = getAvatarColor(meetup.hostName || '호스트');

    return (
      <div key={meetup.id}>
        <div
          onClick={() => navigate(`/meetup/${meetup.id}`)}
          onMouseEnter={() => setHoveredCardId(meetup.id)}
          onMouseLeave={() => setHoveredCardId(null)}
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 18,
            padding: '14px 20px',
            cursor: 'pointer',
            backgroundColor: isHovered ? '#FAFAFA' : 'transparent',
            transition: 'background-color 150ms ease',
          }}
        >
          {/* 70x70 rounded image placeholder */}
          <div style={{
            width: 70,
            height: 70,
            borderRadius: 16,
            flexShrink: 0,
            backgroundColor: avatarBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}>
            <span style={{
              fontSize: 22,
              fontWeight: 700,
              color: '#FFFFFF',
              userSelect: 'none',
            }}>
              {getInitials(meetup.title || '모임')}
            </span>
          </div>

          {/* Text content */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            flex: 1,
            minWidth: 0,
          }}>
            {/* Row 1: Title */}
            <div style={{
              fontSize: 16,
              fontWeight: 600,
              color: '#121212',
              lineHeight: '22px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap' as const,
              fontFamily: 'Pretendard, -apple-system, sans-serif',
            }}>
              {meetup.title || '제목 없음'}
            </div>

            {/* Row 2: Category + Location */}
            <div style={{
              fontSize: 14,
              fontWeight: 400,
              color: '#293038',
              lineHeight: '20px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap' as const,
              fontFamily: 'Pretendard, -apple-system, sans-serif',
            }}>
              {categoryLabel} · {locationLabel}
            </div>

            {/* Row 3: Date + Participants meta */}
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              fontSize: 14,
              fontWeight: 400,
              lineHeight: '20px',
              fontFamily: 'Pretendard, -apple-system, sans-serif',
            }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                color: '#878B94',
              }}>
                <Icon name="calendar" size={13} color="#878B94" />
                <span style={{
                  maxWidth: 120,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap' as const,
                }}>
                  {formatKoreanDateTime(meetup.date, 'datetime')}
                </span>
              </span>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                color: '#878B94',
              }}>
                <Icon name="users" size={13} color="#878B94" />
                {meetup.currentParticipants ?? 0}/{meetup.maxParticipants ?? 4}
              </span>
              {/* Gray tag for status */}
              <span style={{
                fontSize: 12,
                fontWeight: 500,
                color: isFull ? '#878B94' : '#121212',
                backgroundColor: isFull ? '#f1f2f3' : '#f1f2f3',
                padding: '2px 8px',
                borderRadius: 4,
                marginLeft: 2,
              }}>
                {isFull ? '마감' : '모집중'}
              </span>
            </div>
          </div>
        </div>

        {/* Separator line */}
        {index < filteredMeetups.length - 1 && (
          <div style={{
            height: 1,
            backgroundColor: '#f1f2f3',
            marginLeft: 20 + 70 + 18,
            marginRight: 20,
          }} />
        )}
      </div>
    );
  };

  // Restaurant item (compact style)
  const renderRestaurantItem = (restaurant: any, index: number, total: number) => {
    return (
      <div key={restaurant.id}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 18,
            padding: '14px 20px',
            cursor: 'pointer',
            transition: 'background-color 150ms ease',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#FAFAFA'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
        >
          {/* Placeholder image */}
          <div style={{
            width: 70,
            height: 70,
            borderRadius: 16,
            flexShrink: 0,
            backgroundColor: '#F5F5F5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon name="map-pin" size={24} color="#878B94" />
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            flex: 1,
            minWidth: 0,
          }}>
            <div style={{
              fontSize: 16,
              fontWeight: 600,
              color: '#121212',
              lineHeight: '22px',
              fontFamily: 'Pretendard, -apple-system, sans-serif',
            }}>
              {restaurant.name}
            </div>
            <div style={{
              fontSize: 14,
              color: '#293038',
              lineHeight: '20px',
              fontFamily: 'Pretendard, -apple-system, sans-serif',
            }}>
              {restaurant.category} · {restaurant.location}
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 14,
              color: '#878B94',
              fontFamily: 'Pretendard, -apple-system, sans-serif',
            }}>
              <Icon name="star" size={13} color="#E69100" />
              <span>{restaurant.rating}</span>
              <span>·</span>
              <Icon name="clock" size={13} color="#878B94" />
              <span>{restaurant.hours}</span>
            </div>
          </div>
        </div>
        {index < total - 1 && (
          <div style={{
            height: 1,
            backgroundColor: '#f1f2f3',
            marginLeft: 20 + 70 + 18,
            marginRight: 20,
          }} />
        )}
      </div>
    );
  };

  // Skeleton loader matching compact card pattern
  const SkeletonItem = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 18,
      padding: '14px 20px',
    }}>
      <div style={{
        width: 70,
        height: 70,
        borderRadius: 16,
        backgroundColor: '#F5F5F5',
        animation: 'pulse 1.5s ease-in-out infinite',
        flexShrink: 0,
      }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <div style={{ width: '60%', height: 16, borderRadius: 4, backgroundColor: '#F5F5F5' }} />
        <div style={{ width: '80%', height: 14, borderRadius: 4, backgroundColor: '#F5F5F5' }} />
        <div style={{ width: '50%', height: 14, borderRadius: 4, backgroundColor: '#F5F5F5' }} />
      </div>
    </div>
  );

  const renderTabContent = () => {
    if (selectedTab === '전체' || selectedTab === '모집중' || selectedTab === '마감') {
      if (loading) {
        return (
          <div>
            {[1, 2, 3, 4].map((i) => (
              <SkeletonItem key={i} />
            ))}
          </div>
        );
      }

      if (filteredMeetups.length === 0) {
        return (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <EmptyState
              icon="search"
              title="검색 결과가 없습니다"
              description="다른 키워드로 검색해보세요"
            />
          </div>
        );
      }

      return (
        <div>
          {filteredMeetups.map((meetup, index) => renderMeetupItem(meetup, index))}
        </div>
      );
    }

    return null;
  };

  const restaurants = [
    { id: 1, name: '맛있는 한식당', category: '한식', rating: 4.5, location: '강남구', hours: '11:00-22:00' },
    { id: 2, name: '이탈리안 레스토랑', category: '양식', rating: 4.3, location: '서초구', hours: '12:00-23:00' },
    { id: 3, name: '라멘 맛집', category: '일식', rating: 4.7, location: '송파구', hours: '11:30-21:30' },
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      maxWidth: 480,
      margin: '0 auto',
      backgroundColor: '#FFFFFF',
      fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
      position: 'relative',
    }}>
      {/* Search header - sticky */}
      <div style={{
        padding: '16px 20px 12px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #f1f2f3',
        flexShrink: 0,
        zIndex: 10,
      }}>
        {/* Search input */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          borderRadius: 8,
          border: searchInputFocused ? '1.5px solid #121212' : '1px solid #f1f2f3',
          padding: '10px 14px',
          transition: 'border-color 150ms ease',
          gap: 10,
        }}>
          <Icon name="search" size={16} color={searchInputFocused ? '#121212' : '#878B94'} />
          <TextInput
            style={styles.searchInput}
            placeholder="약속이나 장소를 검색해보세요"
            value={searchText}
            onChangeText={(text) => {
              setSearchText(text);
              if (text.length === 0) {
                setShowSuggestions(false);
                setSearchIntent(null);
                setSuggestions([]);
              }
            }}
            placeholderTextColor="#878B94"
            onFocus={() => { setSearchInputFocused(true); setShowSuggestions(searchText.length > 0); }}
            onBlur={() => setSearchInputFocused(false)}
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchText('');
                setShowSuggestions(false);
                setSearchIntent(null);
                setSuggestions([]);
              }}
              style={{ padding: 4 }}
            >
              <Icon name="times" size={14} color="#878B94" />
            </TouchableOpacity>
          )}
          {(isAnalyzing || loading) && (
            <ActivityIndicator size="small" color="#FFA529" style={{ marginLeft: 4 }} />
          )}
        </div>

        {/* AI search suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 8,
            marginTop: 8,
            border: '1px solid #f1f2f3',
            overflow: 'hidden',
            maxHeight: 200,
            boxShadow: CSS_SHADOWS.medium,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              borderBottom: '1px solid #f1f2f3',
            }}>
              <Icon name="zap" size={12} color="#FFA529" />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#FFA529' }}>AI 추천 검색어</span>
            </div>
            {suggestions.map((suggestion, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setSearchText(suggestion);
                  setShowSuggestions(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  borderBottom: idx < suggestions.length - 1 ? '1px solid #f1f2f3' : 'none',
                  cursor: 'pointer',
                  transition: 'background-color 150ms ease',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#FAFAFA'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
              >
                <Icon name="arrow-up-left" size={12} color="#878B94" />
                <span style={{ fontSize: 13, color: '#121212', flex: 1 }}>{suggestion}</span>
              </div>
            ))}
          </div>
        )}

        {/* AI intent analysis */}
        {searchIntent && (
          <div style={{
            backgroundColor: '#FAFAFA',
            padding: 10,
            marginTop: 8,
            borderRadius: 8,
            border: '1px solid #f1f2f3',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 6,
            }}>
              <img
                src={riceCharacterImage}
                alt="밥알이"
                style={{ width: 20, height: 20, objectFit: 'cover' }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <span style={{ fontSize: 11, color: '#5F5F5F', fontWeight: 500 }}>AI가 분석한 검색 의도</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {searchIntent.category && (
                <span style={{
                  fontSize: 11,
                  color: '#5F5F5F',
                  backgroundColor: '#FFFFFF',
                  padding: '3px 8px',
                  borderRadius: 4,
                  border: '1px solid #f1f2f3',
                  fontWeight: 500,
                }}>
                  카테고리: {searchIntent.category}
                </span>
              )}
              {searchIntent.location && (
                <span style={{
                  fontSize: 11,
                  color: '#5F5F5F',
                  backgroundColor: '#FFFFFF',
                  padding: '3px 8px',
                  borderRadius: 4,
                  border: '1px solid #f1f2f3',
                  fontWeight: 500,
                }}>
                  지역: {searchIntent.location}
                </span>
              )}
              {searchIntent.priceRange && (
                <span style={{
                  fontSize: 11,
                  color: '#5F5F5F',
                  backgroundColor: '#FFFFFF',
                  padding: '3px 8px',
                  borderRadius: 4,
                  border: '1px solid #f1f2f3',
                  fontWeight: 500,
                }}>
                  가격: {searchIntent.priceRange}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tab navigation - underline style */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #f1f2f3',
        padding: '0 20px',
        flexShrink: 0,
      }}>
        {tabs.map((tab) => {
          const isActive = selectedTab === tab;
          return (
            <div
              key={tab}
              onClick={() => setSelectedTab(tab)}
              style={{
                flex: 1,
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                borderBottom: isActive ? '2px solid #121212' : '2px solid transparent',
                transition: 'border-color 150ms ease',
              }}
            >
              <span style={{
                fontSize: 14,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#121212' : '#666666',
                fontFamily: 'Pretendard, -apple-system, sans-serif',
              }}>
                {tab}
              </span>
            </div>
          );
        })}
      </div>

      {/* Active filter chips */}
      {(selectedCategory !== '전체' || selectedLocation !== '전체') && (
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          padding: '8px 20px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #f1f2f3',
          flexShrink: 0,
        }}>
          {selectedCategory !== '전체' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              backgroundColor: '#f1f2f3',
              borderRadius: 4,
            }}>
              <span style={{ fontSize: 12, color: '#5F5F5F', fontWeight: 500 }}>{selectedCategory}</span>
              <div
                onClick={() => setSelectedCategory('전체')}
                style={{ cursor: 'pointer', display: 'flex' }}
              >
                <Icon name="times" size={10} color="#878B94" />
              </div>
            </div>
          )}
          {selectedLocation !== '전체' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              backgroundColor: '#f1f2f3',
              borderRadius: 4,
            }}>
              <span style={{ fontSize: 12, color: '#5F5F5F', fontWeight: 500 }}>{selectedLocation}</span>
              <div
                onClick={() => setSelectedLocation('전체')}
                style={{ cursor: 'pointer', display: 'flex' }}
              >
                <Icon name="times" size={10} color="#878B94" />
              </div>
            </div>
          )}
          <div
            onClick={() => {
              setSelectedCategory('전체');
              setSelectedLocation('전체');
              performSearch(searchText);
            }}
            style={{
              marginLeft: 'auto',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            <span style={{
              fontSize: 11,
              color: '#878B94',
              fontWeight: 500,
              textDecoration: 'underline',
            }}>초기화</span>
          </div>
        </div>
      )}

      {/* Results count header */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 20px',
        backgroundColor: '#FFFFFF',
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: 12,
          color: '#878B94',
          fontWeight: 500,
          fontFamily: 'Pretendard, -apple-system, sans-serif',
        }}>
          총 {filteredMeetups.length}개의 약속
          {searchText && aiSearchService.isAIEnabled() && ' (AI 필터링 적용)'}
        </span>
        {searchText && (
          <div
            onClick={() => {
              setSearchText('');
              setSelectedCategory('전체');
              setSelectedLocation('전체');
              setShowSuggestions(false);
              setSearchIntent(null);
              performSearch('');
            }}
            style={{
              padding: '4px 10px',
              borderRadius: 4,
              border: '1px solid #E0E0E0',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 11, color: '#878B94', fontWeight: 500 }}>초기화</span>
          </div>
        )}
      </div>

      {/* Scrollable results area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        backgroundColor: '#FFFFFF',
      }}>
        {renderTabContent()}

        {/* Bottom padding for safe area */}
        <div style={{ height: 80 }} />
      </div>

      {/* Pulse animation keyframes */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

const styles = StyleSheet.create({
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    color: '#121212',
    letterSpacing: -0.05,
    // @ts-ignore
    outline: 'none',
    fontFamily: 'Pretendard, -apple-system, sans-serif',
  },
});

export default SearchScreen;
