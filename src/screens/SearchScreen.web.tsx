import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, SHADOWS, LAYOUT, CSS_SHADOWS, CARD_STYLE } from '../styles/colors';
import { TYPOGRAPHY, FONT_WEIGHTS } from '../styles/typography';
import { SPACING, BORDER_RADIUS } from '../styles/spacing';
import { Icon } from '../components/Icon';
import EmptyState from '../components/EmptyState';
import { useMeetups } from '../hooks/useMeetups';
import { SEARCH_CATEGORIES, SEARCH_LOCATIONS, SORT_OPTION_NAMES } from '../constants/categories';
import { formatKoreanDateTime } from '../utils/dateUtils';
import aiSearchService from '../services/aiSearchService';
import riceCharacterImage from '../assets/images/rice-character.png';
import { FadeIn } from '../components/animated';
import { MeetupCardSkeleton } from '../components/skeleton';
import { getAvatarColor, getInitials } from '../utils/avatarColor';

interface SearchScreenProps {
  navigation?: any;
  user?: any;
}

const SearchScreen: React.FC<SearchScreenProps> = ({ navigation, user }) => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [selectedTab, setSelectedTab] = useState('내주변모임');
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [selectedLocation, setSelectedLocation] = useState('전체');
  const [selectedSort, setSelectedSort] = useState('최신순');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchIntent, setSearchIntent] = useState<any>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchInputFocused, setSearchInputFocused] = useState(false);
  
  const { meetups, searchMeetups, loading } = useMeetups();
  
  const tabs = ['내주변모임', '맛집리스트', '필터링'];

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
    return matchesSearch && matchesCategory && matchesLocation;
  });

  const renderTabButton = (title: string, selectedValue: string, onPress: (value: string) => void, options: string[]) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabContainer}>
      {options.map((option) => {
        const isSelected = selectedValue === option;
        return (
          <div
            key={option}
            style={{
              transition: 'all 150ms ease',
              borderRadius: 20,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                (e.currentTarget.firstChild as HTMLElement).style.borderColor = COLORS.primary.main;
                (e.currentTarget.firstChild as HTMLElement).style.backgroundColor = 'rgba(139, 105, 20, 0.06)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                (e.currentTarget.firstChild as HTMLElement).style.borderColor = COLORS.neutral.grey200;
                (e.currentTarget.firstChild as HTMLElement).style.backgroundColor = COLORS.neutral.white;
              }
            }}
          >
            <TouchableOpacity
              style={[
                styles.tabButton,
                isSelected && styles.selectedTabButton
              ]}
              onPress={() => onPress(option)}
            >
              <Text style={[
                styles.tabButtonText,
                isSelected && styles.selectedTabButtonText
              ]}>
                {option}
              </Text>
            </TouchableOpacity>
          </div>
        );
      })}
    </ScrollView>
  );

  const renderMeetupItem = (meetup: any, index?: number) => (
    <TouchableOpacity
      style={styles.meetupCard}
      onPress={() => navigate(`/meetup/${meetup.id}`)}
    >
      <View style={styles.meetupHeader}>
        <View style={styles.meetupTitleSection}>
          <Text style={styles.meetupTitle} numberOfLines={2}>{meetup.title || '제목 없음'}</Text>
          <View style={styles.meetupMeta}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
              <Icon name="map-pin" size={14} color={COLORS.text.secondary} />
              <Text style={styles.meetupLocation}>{meetup.location || '장소 미정'}</Text>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
              <Icon name="clock" size={14} color={COLORS.text.secondary} />
              <Text style={styles.meetupTime}>
                {formatKoreanDateTime(meetup.date, 'datetime')}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.meetupStatus}>
          <Text style={styles.statusText}>모집중</Text>
          <Text style={styles.participantCount}>{meetup.currentParticipants ?? 0}/{meetup.maxParticipants ?? 4}</Text>
        </View>
      </View>
      
      <View style={styles.meetupFooter}>
        <View style={styles.hostInfo}>
          <View style={[styles.hostAvatar, { backgroundColor: getAvatarColor(meetup.hostName || '호스트') }]}>
            <Text style={styles.hostInitial}>{getInitials(meetup.hostName || '호스트')}</Text>
          </View>
          <Text style={styles.hostName}>{meetup.hostName || '호스트'}</Text>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 2}}>
            <Icon name="star" size={14} color={COLORS.functional.warning} />
            <Text style={styles.hostRating}>4.8</Text>
          </View>
        </View>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>{meetup.category || '기타'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderRestaurantItem = (restaurant: any) => (
    <TouchableOpacity style={styles.restaurantCard}>
      <View style={styles.restaurantHeader}>
        <Text style={styles.restaurantName}>{restaurant.name}</Text>
        <View style={styles.restaurantRating}>
          <Icon name="star" size={12} color={COLORS.functional.warning} />
          <Text style={styles.ratingText}>{restaurant.rating}</Text>
        </View>
      </View>
      <Text style={styles.restaurantCategory}>{restaurant.category}</Text>
      <View style={styles.restaurantMeta}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
          <Icon name="map-pin" size={14} color={COLORS.text.secondary} />
          <Text style={styles.restaurantLocation}>{restaurant.location}</Text>
        </View>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
          <Icon name="clock" size={14} color={COLORS.text.secondary} />
          <Text style={styles.restaurantHours}>{restaurant.hours}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderTabContent = () => {
    switch (selectedTab) {
      case '내주변모임':
        if (loading) {
          return (
            <View style={styles.loadingContainer}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={{ paddingHorizontal: 16, marginBottom: 16 }}>
                  <MeetupCardSkeleton />
                </View>
              ))}
            </View>
          );
        }
        
        return (
          <FadeIn>
            <FlatList
              data={filteredMeetups}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item, index }) => (
                <FadeIn delay={index < 8 ? index * 40 : 0}>
                  {renderMeetupItem(item, index)}
                </FadeIn>
              )}
              style={styles.resultsList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.resultsContainer}
              ListEmptyComponent={
                <EmptyState
                  icon="search"
                  title="검색 결과가 없습니다"
                  description="다른 키워드로 검색해보세요"
                />
              }
            />
          </FadeIn>
        );
      
      case '맛집리스트':
        const restaurants = [
          { id: 1, name: '맛있는 한식당', category: '한식', rating: 4.5, location: '강남구', hours: '11:00-22:00' },
          { id: 2, name: '이탈리안 레스토랑', category: '양식', rating: 4.3, location: '서초구', hours: '12:00-23:00' },
          { id: 3, name: '라멘 맛집', category: '일식', rating: 4.7, location: '송파구', hours: '11:30-21:30' },
        ];
        return (
          <FlatList
            data={restaurants}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => renderRestaurantItem(item)}
            style={styles.resultsList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.resultsContainer}
          />
        );
      
      case '필터링':
        return (
          <ScrollView style={styles.filterContent}>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>상세 필터</Text>
              
              <Text style={styles.filterLabel}>카테고리</Text>
              {renderTabButton('카테고리', selectedCategory, setSelectedCategory, categories)}
              
              <Text style={styles.filterLabel}>지역</Text>
              {renderTabButton('지역', selectedLocation, setSelectedLocation, locations)}
              
              <Text style={styles.filterLabel}>정렬</Text>
              {renderTabButton('정렬', selectedSort, setSelectedSort, sortOptions)}
              
              <TouchableOpacity style={styles.applyFilterButton}>
                <Text style={styles.applyFilterText}>필터 적용</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        );
      
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* 스크롤바 숨김 스타일 (webkit) */}
      <style dangerouslySetInnerHTML={{ __html: `
        .filter-chips-scroll::-webkit-scrollbar { display: none; }
      ` }} />
      {/* 검색바 */}
      <View style={styles.searchContainer}>
        <View style={[
          styles.searchInputContainer,
          searchInputFocused && {
            borderWidth: 1,
            borderColor: COLORS.primary.main,
            boxShadow: '0 0 0 3px rgba(139, 105, 20, 0.15)',
          } as any,
        ]}>
          <Icon name="search" size={16} color={searchInputFocused ? COLORS.primary.main : COLORS.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="모임 제목이나 장소를 검색해보세요 (AI 추천 기능)"
            value={searchText}
            onChangeText={(text) => {
              setSearchText(text);
              if (text.length === 0) {
                setShowSuggestions(false);
                setSearchIntent(null);
                setSuggestions([]);
              }
            }}
            placeholderTextColor={COLORS.text.secondary}
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
              style={styles.searchClearButton}
            >
              <Icon name="times" size={14} color={COLORS.text.tertiary} />
            </TouchableOpacity>
          )}
          {(isAnalyzing || loading) && (
            <ActivityIndicator size="small" color={COLORS.primary.main} style={{ marginLeft: 8 }} />
          )}
        </View>
        
        {/* AI 검색 제안 */}
        {showSuggestions && suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <View style={styles.suggestionsHeader}>
              <Icon name="zap" size={14} color={COLORS.primary.main} />
              <Text style={styles.suggestionsTitle}>AI 추천 검색어</Text>
            </View>
            {suggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionItem}
                onPress={() => {
                  setSearchText(suggestion);
                  setShowSuggestions(false);
                }}
              >
                <Icon name="arrow-up-left" size={12} color={COLORS.text.secondary} />
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        {/* AI 분석 결과 표시 */}
        {searchIntent && (
          <View style={styles.intentContainer}>
            <Text style={styles.intentText}>
              {aiSearchService.isAIEnabled() ? (
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                  <img 
                    src={riceCharacterImage} 
                    alt="밥알이" 
                    style={{ width: '28px', height: '28px', objectFit: 'cover' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      const textNode = document.createTextNode('🍚');
                      (e.target as HTMLImageElement).parentNode!.insertBefore(textNode, e.target as HTMLImageElement);
                    }}
                  />
                  <Text>AI가 분석한 검색 의도:</Text>
                </View>
              ) : '🔍 검색 필터가 자동 적용되었습니다:'}
            </Text>
            <View style={styles.intentTags}>
              {searchIntent.category && (
                <View style={styles.intentTag}>
                  <Text style={styles.intentTagText}>카테고리: {searchIntent.category}</Text>
                </View>
              )}
              {searchIntent.location && (
                <View style={styles.intentTag}>
                  <Text style={styles.intentTagText}>지역: {searchIntent.location}</Text>
                </View>
              )}
              {searchIntent.priceRange && (
                <View style={styles.intentTag}>
                  <Text style={styles.intentTagText}>가격: {searchIntent.priceRange}</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>

      {/* 탭 네비게이션 */}
      <View style={styles.tabNavigation}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tabNavButton,
              selectedTab === tab && styles.selectedTabNavButton
            ]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text style={[
              styles.tabNavButtonText,
              selectedTab === tab && styles.selectedTabNavButtonText
            ]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 필터 칩 */}
      {(selectedCategory !== '전체' || selectedLocation !== '전체') && (
        <div className="filter-chips-scroll" style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          flexWrap: 'nowrap',
          gap: 12,
          paddingLeft: 16,
          paddingRight: 16,
          paddingTop: 8,
          paddingBottom: 8,
          backgroundColor: COLORS.neutral.white,
          borderBottom: `1px solid ${COLORS.neutral.grey100}`,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}>
          {selectedCategory !== '전체' && (
            <div
              style={{ transition: 'all 150ms ease', borderRadius: 16, display: 'inline-flex' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              <View style={styles.filterChip}>
                <Text style={styles.filterChipText}>{selectedCategory}</Text>
                <TouchableOpacity onPress={() => setSelectedCategory('전체')}>
                  <Icon name="times" size={10} color={COLORS.text.secondary} />
                </TouchableOpacity>
              </View>
            </div>
          )}
          {selectedLocation !== '전체' && (
            <div
              style={{ transition: 'all 150ms ease', borderRadius: 16, display: 'inline-flex' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              <View style={styles.filterChip}>
                <Text style={styles.filterChipText}>{selectedLocation}</Text>
                <TouchableOpacity onPress={() => setSelectedLocation('전체')}>
                  <Icon name="times" size={10} color={COLORS.text.secondary} />
                </TouchableOpacity>
              </View>
            </div>
          )}
          <TouchableOpacity
            style={styles.filterResetButton}
            onPress={() => {
              setSelectedCategory('전체');
              setSelectedLocation('전체');
              performSearch(searchText);
            }}
          >
            <Text style={styles.filterResetText}>초기화</Text>
          </TouchableOpacity>
        </div>
      )}

      {/* 검색 결과 */}
      {selectedTab === '내주변모임' && (
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>
            총 {filteredMeetups.length}개의 모임
            {searchText && aiSearchService.isAIEnabled() && ' (AI 필터링 적용)'}
          </Text>
          {searchText && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setSearchText('');
                setSelectedCategory('전체');
                setSelectedLocation('전체');
                setShowSuggestions(false);
                setSearchIntent(null);
                performSearch('');
              }}
            >
              <Text style={styles.clearButtonText}>초기화</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {renderTabContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  searchContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    height: LAYOUT.HEADER_HEIGHT,
    paddingHorizontal: LAYOUT.HEADER_PADDING_HORIZONTAL,
    backgroundColor: 'rgba(255, 251, 247, 0.95)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderBottomWidth: 0,
    justifyContent: 'center',
    ...SHADOWS.medium,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 12,
    transition: 'border-color 150ms ease, box-shadow 150ms ease',
    ...SHADOWS.small,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    ...TYPOGRAPHY.input,
    color: COLORS.text.primary,
  },
  searchClearButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.sm,
  },
  filtersSection: {
    paddingVertical: 16,
    paddingTop: LAYOUT.HEADER_HEIGHT + LAYOUT.CONTENT_TOP_MARGIN, // 고정 검색바 + 마진
  },
  filterLabel: {
    ...TYPOGRAPHY.card.subtitle,
    color: COLORS.text.primary,
    marginLeft: 16,
    marginBottom: 8,
    marginTop: 8,
  },
  tabContainer: {
    paddingHorizontal: 16,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: COLORS.neutral.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
  },
  selectedTabButton: {
    backgroundColor: COLORS.primary.main,
    borderColor: COLORS.primary.main,
  },
  tabButtonText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  selectedTabButtonText: {
    color: COLORS.text.white,
    fontWeight: '600',
  },
  resultsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  resultsCount: {
    fontSize: 15,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  resultsList: {
    flex: 1,
  },
  resultsContainer: {
    paddingBottom: 80,
  },
  meetupCard: {
    backgroundColor: COLORS.neutral.white,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: CARD_STYLE.borderRadius,
    borderWidth: CARD_STYLE.borderWidth,
    borderColor: CARD_STYLE.borderColor,
    ...SHADOWS.medium,
  },
  meetupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  meetupTitleSection: {
    flex: 1,
    marginRight: 12,
  },
  meetupTitle: {
    ...TYPOGRAPHY.card.title,
    marginBottom: 6,
  },
  meetupMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  meetupLocation: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  meetupTime: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  meetupStatus: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 11,
    color: COLORS.functional.info,
    fontWeight: '600',
    marginBottom: 4,
    backgroundColor: 'rgba(107, 142, 174, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  participantCount: {
    fontSize: 12,
    color: COLORS.primary.main,
    fontWeight: '600',
  },
  meetupFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hostAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  hostInitial: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text.white,
  },
  hostName: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginRight: 8,
  },
  hostRating: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  categoryBadge: {
    backgroundColor: COLORS.neutral.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary.light,
  },
  categoryBadgeText: {
    fontSize: 10,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  tabNavigation: {
    flexDirection: 'row',
    height: 56,
    backgroundColor: COLORS.neutral.white,
    paddingTop: LAYOUT.HEADER_HEIGHT + SPACING.sm,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    gap: 0,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
  },
  tabNavButton: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  selectedTabNavButton: {
    borderBottomColor: COLORS.primary.main,
  },
  tabNavButtonText: {
    fontSize: 14,
    fontWeight: FONT_WEIGHTS.medium as any,
    color: COLORS.text.tertiary,
  },
  selectedTabNavButtonText: {
    color: COLORS.primary.main,
    fontWeight: '700' as any,
  },
  restaurantCard: {
    backgroundColor: COLORS.neutral.white,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral.grey100,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
  },
  restaurantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    flex: 1,
  },
  restaurantRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  restaurantCategory: {
    fontSize: 12,
    color: COLORS.primary.main,
    fontWeight: '500',
    marginBottom: 8,
  },
  restaurantMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  restaurantLocation: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  restaurantHours: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  filterContent: {
    flex: 1,
  },
  filterSection: {
    padding: 20,
  },
  filterSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 20,
  },
  applyFilterButton: {
    backgroundColor: COLORS.primary.main,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
    ...SHADOWS.medium,
  },
  applyFilterText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.white,
  },
  // AI 검색 관련 스타일
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    marginTop: 4,
    ...SHADOWS.medium,
    maxHeight: 200,
    overflow: 'hidden',
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.primary.light,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
  },
  suggestionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary.main,
    marginLeft: 6,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
  },
  suggestionText: {
    fontSize: 14,
    color: COLORS.text.primary,
    marginLeft: 8,
    flex: 1,
  },
  intentContainer: {
    backgroundColor: COLORS.primary.light,
    padding: 12,
    marginTop: 8,
    borderRadius: 12,
  },
  intentText: {
    fontSize: 12,
    color: COLORS.primary.main,
    fontWeight: '500',
    marginBottom: 8,
  },
  intentTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  intentTag: {
    backgroundColor: COLORS.primary.light,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  intentTagText: {
    fontSize: 11,
    color: COLORS.primary.main,
    fontWeight: '500',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
  },
  clearButtonText: {
    fontSize: 12,
    color: COLORS.functional.error,
    fontWeight: '500',
  },
  // 로딩 및 빈 상태 스타일
  loadingContainer: {
    flex: 1,
    padding: 0,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    marginTop: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 200,
  },
  emptyText: {
    fontSize: 18,
    color: COLORS.text.primary,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  // ─── 필터 칩 ──────────────────────────────────────────
  filterChipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    gap: 12,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'none',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.primary.accent,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
  },
  filterChipText: {
    fontSize: 12,
    color: COLORS.text.primary,
    fontWeight: FONT_WEIGHTS.medium as any,
  },
  filterResetButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    marginLeft: 'auto',
  },
  filterResetText: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    fontWeight: FONT_WEIGHTS.medium as any,
    textDecorationLine: 'underline',
  },
});

export default SearchScreen;