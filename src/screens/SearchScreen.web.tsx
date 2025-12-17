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
import { COLORS, SHADOWS, LAYOUT } from '../styles/colors';
import { TYPOGRAPHY } from '../styles/typography';
import { Icon } from '../components/Icon';
import { useMeetups } from '../hooks/useMeetups';
import { SEARCH_CATEGORIES, SEARCH_LOCATIONS, SORT_OPTION_NAMES } from '../constants/categories';
import { formatKoreanDateTime } from '../utils/dateUtils';
import aiSearchService from '../services/aiSearchService';

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
  
  const { meetups, searchMeetups, loading } = useMeetups();
  
  const tabs = ['내주변모임', '맛집리스트', '필터링'];

  const categories = SEARCH_CATEGORIES;
  const locations = SEARCH_LOCATIONS;
  const sortOptions = SORT_OPTION_NAMES;

  // 실제 검색 수행
  const performSearch = async (searchText: string, category: string = selectedCategory, location: string = selectedLocation) => {
    console.log('🔍 검색 수행:', { searchText, category, location });
    try {
      await searchMeetups({
        search: searchText || undefined,
        category: category !== '전체' ? category : undefined,
        location: location !== '전체' ? location : undefined,
        limit: 50
      });
    } catch (error) {
      console.error('검색 오류:', error);
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
        console.error('AI 검색 분석 오류:', error);
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
                         meetup.title.toLowerCase().includes(searchText.toLowerCase()) ||
                         meetup.location.toLowerCase().includes(searchText.toLowerCase()) ||
                         meetup.description?.toLowerCase().includes(searchText.toLowerCase());
    const matchesCategory = selectedCategory === '전체' || meetup.category === selectedCategory;
    const matchesLocation = selectedLocation === '전체' || meetup.location.includes(selectedLocation.replace('구', ''));
    return matchesSearch && matchesCategory && matchesLocation;
  });

  const renderTabButton = (title: string, selectedValue: string, onPress: (value: string) => void, options: string[]) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabContainer}>
      {options.map((option) => (
        <TouchableOpacity
          key={option}
          style={[
            styles.tabButton,
            selectedValue === option && styles.selectedTabButton
          ]}
          onPress={() => onPress(option)}
        >
          <Text style={[
            styles.tabButtonText,
            selectedValue === option && styles.selectedTabButtonText
          ]}>
            {option}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderMeetupItem = (meetup: any) => (
    <TouchableOpacity
      style={styles.meetupCard}
      onPress={() => navigate(`/meetup/${meetup.id}`)}
    >
      <View style={styles.meetupHeader}>
        <View style={styles.meetupTitleSection}>
          <Text style={styles.meetupTitle} numberOfLines={2}>{meetup.title}</Text>
          <View style={styles.meetupMeta}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
              <Icon name="map-pin" size={11} color={COLORS.text.secondary} />
              <Text style={styles.meetupLocation}>{meetup.location}</Text>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
              <Icon name="clock" size={11} color={COLORS.text.secondary} />
              <Text style={styles.meetupTime}>
                {formatKoreanDateTime(meetup.date, 'datetime')}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.meetupStatus}>
          <Text style={styles.statusText}>모집중</Text>
          <Text style={styles.participantCount}>{meetup.currentParticipants}/{meetup.maxParticipants}</Text>
        </View>
      </View>
      
      <View style={styles.meetupFooter}>
        <View style={styles.hostInfo}>
          <View style={styles.hostAvatar}>
            <Text style={styles.hostInitial}>{meetup.hostName.charAt(0)}</Text>
          </View>
          <Text style={styles.hostName}>{meetup.hostName}</Text>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 2}}>
            <Icon name="star" size={11} color={COLORS.functional.warning} />
            <Text style={styles.hostRating}>4.8</Text>
          </View>
        </View>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>{meetup.category}</Text>
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
          <Icon name="map-pin" size={11} color={COLORS.text.secondary} />
          <Text style={styles.restaurantLocation}>{restaurant.location}</Text>
        </View>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
          <Icon name="clock" size={11} color={COLORS.text.secondary} />
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
              <ActivityIndicator size="large" color={COLORS.primary.main} />
              <Text style={styles.loadingText}>검색 중...</Text>
            </View>
          );
        }
        
        return (
          <FlatList
            data={filteredMeetups}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => renderMeetupItem(item)}
            style={styles.resultsList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.resultsContainer}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>검색 결과가 없습니다</Text>
                <Text style={styles.emptySubText}>다른 검색어나 필터를 시도해보세요</Text>
              </View>
            }
          />
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
      {/* 검색바 */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={16} color="#5f6368" />
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
            placeholderTextColor="#5f6368"
            onFocus={() => setShowSuggestions(searchText.length > 0)}
          />
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
                    src="/images/rice-character.png" 
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
                // 초기화 후 전체 목록 로드
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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderBottomWidth: 0,
    justifyContent: 'center',
    ...SHADOWS.medium,
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    borderWidth: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...SHADOWS.small,
    shadowColor: 'rgba(0,0,0,0.04)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    ...TYPOGRAPHY.input,
    color: '#202124',
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
    borderColor: '#e9ecef',
  },
  selectedTabButton: {
    backgroundColor: '#ede0c8',
    borderColor: '#ede0c8',
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  resultsCount: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  resultsList: {
    flex: 1,
  },
  resultsContainer: {
    paddingBottom: 20,
  },
  meetupCard: {
    backgroundColor: COLORS.neutral.white,
    marginHorizontal: 0,
    marginTop: 0,
    padding: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 6,
    lineHeight: 22,
  },
  meetupMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  meetupLocation: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '500',
  },
  meetupTime: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '500',
  },
  meetupStatus: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '600',
    marginBottom: 4,
  },
  participantCount: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '500',
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
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  hostInitial: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primary.main,
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
    borderColor: '#e9ecef',
  },
  categoryBadgeText: {
    fontSize: 10,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderBottomWidth: 0,
    paddingTop: LAYOUT.HEADER_HEIGHT + LAYOUT.CONTENT_TOP_MARGIN,
    marginHorizontal: 16,
    borderRadius: 16,
    marginTop: 8,
    ...SHADOWS.small,
    shadowColor: 'rgba(0,0,0,0.04)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  tabNavButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: 4,
    marginVertical: 4,
  },
  selectedTabNavButton: {
    backgroundColor: COLORS.primary.main,
    ...SHADOWS.small,
  },
  tabNavButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.secondary,
  },
  selectedTabNavButtonText: {
    color: COLORS.text.white,
    fontWeight: '600',
  },
  restaurantCard: {
    backgroundColor: COLORS.neutral.white,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    padding: 16,
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
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    maxHeight: 200,
    overflow: 'hidden',
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    borderBottomColor: '#f9f9f9',
  },
  suggestionText: {
    fontSize: 14,
    color: COLORS.text.primary,
    marginLeft: 8,
    flex: 1,
  },
  intentContainer: {
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    padding: 12,
    marginTop: 8,
    borderRadius: 8,
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
    borderRadius: 8,
  },
  clearButtonText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '500',
  },
  // 로딩 및 빈 상태 스타일
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
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
});

export default SearchScreen;