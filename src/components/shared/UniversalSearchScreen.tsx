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
  Image,
} from 'react-native';
import { COLORS, SHADOWS, LAYOUT } from '../../styles/colors';
import { TYPOGRAPHY } from '../../styles/typography';
import { SPACING, BORDER_RADIUS } from '../../styles/spacing';
import { Icon } from '../Icon';
import { useMeetups } from '../../hooks/useMeetups';
import { SEARCH_CATEGORIES, SEARCH_LOCATIONS, SORT_OPTION_NAMES } from '../../constants/categories';
import { formatKoreanDateTime } from '../../utils/dateUtils';
import aiSearchService from '../../services/aiSearchService';
import riceCharacterImage from '../../assets/images/rice-character.png';

interface NavigationAdapter {
  navigate: (screen: string, params?: any) => void;
  goBack?: () => void;
}

interface UniversalSearchScreenProps {
  navigation: NavigationAdapter;
  user?: any;
}

const UniversalSearchScreen: React.FC<UniversalSearchScreenProps> = ({ navigation, user }) => {
  const [searchText, setSearchText] = useState('');
  const [selectedTab, setSelectedTab] = useState('내주변약속');
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [selectedLocation, setSelectedLocation] = useState('전체');
  const [selectedSort, setSelectedSort] = useState('최신순');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchIntent, setSearchIntent] = useState<any>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { meetups, searchMeetups, loading } = useMeetups();

  const tabs = ['내주변약속', '맛집리스트', '필터링'];

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
    } catch (_error) {
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
      } catch (_error) {
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

  const renderChipRow = (title: string, selectedValue: string, onPress: (value: string) => void, options: string[]) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipContainer}>
      {options.map((option) => (
        <TouchableOpacity
          key={option}
          style={[
            styles.chip,
            selectedValue === option && styles.chipSelected
          ]}
          onPress={() => onPress(option)}
        >
          <Text style={[
            styles.chipText,
            selectedValue === option && styles.chipTextSelected
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
      onPress={() => navigation.navigate('MeetupDetail', { meetupId: meetup.id })}
      activeOpacity={0.6}
    >
      <View style={styles.meetupHeader}>
        <View style={styles.meetupTitleSection}>
          <Text style={styles.meetupTitle} numberOfLines={2}>{meetup.title}</Text>
          <View style={styles.meetupMeta}>
            <View style={styles.metaItem}>
              <Icon name="map-pin" size={11} color={COLORS.text.tertiary} />
              <Text style={styles.meetupMetaText}>{meetup.location}</Text>
            </View>
            <View style={styles.metaItem}>
              <Icon name="clock" size={11} color={COLORS.text.tertiary} />
              <Text style={styles.meetupMetaText}>
                {formatKoreanDateTime(meetup.date, 'datetime')}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.meetupStatus}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>모집중</Text>
          </View>
          <Text style={styles.participantCount}>{meetup.currentParticipants}/{meetup.maxParticipants}</Text>
        </View>
      </View>

      <View style={styles.meetupDivider} />

      <View style={styles.meetupFooter}>
        <View style={styles.hostInfo}>
          <View style={styles.hostAvatar}>
            <Text style={styles.hostInitial}>{meetup.hostName.charAt(0)}</Text>
          </View>
          <Text style={styles.hostName}>{meetup.hostName}</Text>
          <View style={styles.metaItem}>
            <Icon name="star" size={10} color={COLORS.functional.warning} />
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
    <TouchableOpacity style={styles.restaurantCard} activeOpacity={0.6}>
      <View style={styles.restaurantHeader}>
        <Text style={styles.restaurantName}>{restaurant.name}</Text>
        <View style={styles.metaItem}>
          <Icon name="star" size={11} color={COLORS.functional.warning} />
          <Text style={styles.restaurantRatingText}>{restaurant.rating}</Text>
        </View>
      </View>
      <Text style={styles.restaurantCategory}>{restaurant.category}</Text>
      <View style={styles.restaurantMeta}>
        <View style={styles.metaItem}>
          <Icon name="map-pin" size={11} color={COLORS.text.tertiary} />
          <Text style={styles.restaurantMetaText}>{restaurant.location}</Text>
        </View>
        <View style={styles.metaItem}>
          <Icon name="clock" size={11} color={COLORS.text.tertiary} />
          <Text style={styles.restaurantMetaText}>{restaurant.hours}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderTabContent = () => {
    switch (selectedTab) {
      case '내주변약속':
        if (loading) {
          return (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary.accent} />
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
            contentContainerStyle={styles.resultsListContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="search" size={40} color={COLORS.neutral.grey300} />
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
            contentContainerStyle={styles.resultsListContent}
          />
        );

      case '필터링':
        return (
          <ScrollView style={styles.filterContent} showsVerticalScrollIndicator={false}>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>상세 필터</Text>

              <Text style={styles.filterLabel}>카테고리</Text>
              {renderChipRow('카테고리', selectedCategory, setSelectedCategory, categories)}

              <Text style={styles.filterLabel}>지역</Text>
              {renderChipRow('지역', selectedLocation, setSelectedLocation, locations)}

              <Text style={styles.filterLabel}>정렬</Text>
              {renderChipRow('정렬', selectedSort, setSelectedSort, sortOptions)}

              <TouchableOpacity style={styles.applyFilterButton} activeOpacity={0.7}>
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
      <View style={styles.searchHeader}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={16} color={COLORS.text.tertiary} />
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
            placeholderTextColor={COLORS.neutral.grey400}
            onFocus={() => setShowSuggestions(searchText.length > 0)}
          />
          {(isAnalyzing || loading) && (
            <ActivityIndicator size="small" color={COLORS.primary.accent} style={{ marginLeft: 8 }} />
          )}
        </View>

        {/* AI 검색 제안 */}
        {showSuggestions && suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <View style={styles.suggestionsHeader}>
              <Icon name="zap" size={12} color={COLORS.primary.accent} />
              <Text style={styles.suggestionsTitle}>AI 추천 검색어</Text>
            </View>
            {suggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.suggestionItem,
                  index === suggestions.length - 1 && { borderBottomWidth: 0 },
                ]}
                onPress={() => {
                  setSearchText(suggestion);
                  setShowSuggestions(false);
                }}
              >
                <Icon name="arrow-up-left" size={12} color={COLORS.text.tertiary} />
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* AI 분석 결과 표시 */}
        {searchIntent && (
          <View style={styles.intentContainer}>
            <View style={styles.intentHeader}>
              <Image
                source={riceCharacterImage}
                style={{ width: 20, height: 20 }}
                resizeMode="cover"
              />
              <Text style={styles.intentText}>AI가 분석한 검색 의도</Text>
            </View>
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
              selectedTab === tab && styles.tabNavButtonActive
            ]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text style={[
              styles.tabNavButtonText,
              selectedTab === tab && styles.tabNavButtonTextActive
            ]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 검색 결과 헤더 */}
      {selectedTab === '내주변약속' && (
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>
            총 {filteredMeetups.length}개의 약속
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

  // 검색 헤더
  searchHeader: {
    backgroundColor: COLORS.surface.primary,
    paddingHorizontal: SPACING.xl,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
    zIndex: 10,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.background,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.text.primary,
    marginLeft: 10,
    letterSpacing: -0.05,
  },

  // AI 검색 제안
  suggestionsContainer: {
    backgroundColor: COLORS.surface.primary,
    borderRadius: BORDER_RADIUS.md,
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
    overflow: 'hidden',
    maxHeight: 200,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
  },
  suggestionsTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary.accent,
    marginLeft: 6,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
  },
  suggestionText: {
    fontSize: 13,
    color: COLORS.text.primary,
    marginLeft: 8,
    flex: 1,
  },

  // AI 분석 결과
  intentContainer: {
    backgroundColor: COLORS.neutral.background,
    padding: 10,
    marginTop: 8,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
  },
  intentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  intentText: {
    fontSize: 11,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  intentTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  intentTag: {
    backgroundColor: COLORS.surface.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
  },
  intentTagText: {
    fontSize: 10,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },

  // 탭 네비게이션
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface.primary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
    paddingHorizontal: SPACING.xl,
  },
  tabNavButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabNavButtonActive: {
    borderBottomColor: COLORS.primary.main,
  },
  tabNavButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text.tertiary,
  },
  tabNavButtonTextActive: {
    color: COLORS.text.primary,
    fontWeight: '600',
  },

  // 결과 헤더
  resultsHeader: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultsCount: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    fontWeight: '500',
  },
  resultsList: {
    flex: 1,
  },
  resultsListContent: {
    paddingBottom: 20,
  },

  // 필터 칩
  chipContainer: {
    paddingHorizontal: 0,
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: COLORS.surface.primary,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
  },
  chipSelected: {
    backgroundColor: COLORS.primary.main,
    borderColor: COLORS.primary.main,
  },
  chipText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: COLORS.text.white,
    fontWeight: '600',
  },

  // 모임 카드
  meetupCard: {
    backgroundColor: COLORS.surface.primary,
    marginHorizontal: SPACING.xl,
    marginTop: 10,
    padding: 16,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
  },
  meetupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  meetupTitleSection: {
    flex: 1,
    marginRight: 12,
  },
  meetupTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 6,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  meetupMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  meetupMetaText: {
    fontSize: 11,
    color: COLORS.text.tertiary,
    fontWeight: '400',
  },
  meetupStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    backgroundColor: COLORS.functional.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 10,
    color: COLORS.functional.success,
    fontWeight: '600',
  },
  participantCount: {
    fontSize: 11,
    color: COLORS.text.tertiary,
    fontWeight: '500',
  },
  meetupDivider: {
    height: 1,
    backgroundColor: COLORS.neutral.grey100,
    marginBottom: 10,
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
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.neutral.grey100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  hostInitial: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  hostName: {
    fontSize: 11,
    color: COLORS.text.secondary,
    marginRight: 8,
  },
  hostRating: {
    fontSize: 11,
    color: COLORS.text.tertiary,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
  },
  categoryBadgeText: {
    fontSize: 10,
    color: COLORS.text.tertiary,
    fontWeight: '500',
  },

  // 레스토랑 카드
  restaurantCard: {
    backgroundColor: COLORS.surface.primary,
    marginHorizontal: SPACING.xl,
    marginTop: 10,
    padding: 16,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
  },
  restaurantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  restaurantName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
    flex: 1,
    letterSpacing: -0.2,
  },
  restaurantRatingText: {
    fontSize: 11,
    color: COLORS.text.tertiary,
    fontWeight: '500',
  },
  restaurantCategory: {
    fontSize: 11,
    color: COLORS.primary.accent,
    fontWeight: '500',
    marginBottom: 8,
  },
  restaurantMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  restaurantMetaText: {
    fontSize: 11,
    color: COLORS.text.tertiary,
  },

  // 필터 콘텐츠
  filterContent: {
    flex: 1,
  },
  filterSection: {
    padding: SPACING.xl,
  },
  filterSectionTitle: {
    ...TYPOGRAPHY.heading.h3,
    color: COLORS.text.primary,
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: 8,
    marginTop: 12,
  },
  applyFilterButton: {
    backgroundColor: COLORS.primary.accent,
    borderRadius: BORDER_RADIUS.md,
    padding: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  applyFilterText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.white,
  },

  // 초기화 버튼
  clearButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
  },
  clearButtonText: {
    fontSize: 11,
    color: COLORS.text.tertiary,
    fontWeight: '500',
  },

  // 로딩/빈 상태
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    marginTop: 12,
    fontWeight: '400',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 200,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.text.primary,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 6,
  },
  emptySubText: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default UniversalSearchScreen;
