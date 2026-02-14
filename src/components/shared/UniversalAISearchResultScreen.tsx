import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { COLORS, SHADOWS } from '../../styles/colors';
import { Icon } from '../Icon';
import MeetupCard from '../MeetupCard';
import { useMeetupStore } from '../../store/meetupStore';
import aiSearchService from '../../services/aiSearchService';

// Platform-specific navigation adapter
interface NavigationAdapter {
  navigate: (screen: string, params?: any) => void;
  goBack: () => void;
  replace?: (screen: string, params?: any) => void;
}

interface UniversalAISearchResultScreenProps {
  navigation: NavigationAdapter;
  user?: any;
  initialQuery?: string;
  autoSearch?: boolean;
  // Platform specific components
  AnimatedText?: React.ComponentType<any>;
  GradientText?: React.ComponentType<any>;
  onSearchResult?: (results: any) => void;
}

interface SearchResult {
  isNoMatch?: boolean;
  userContext?: string;
  noMatchReason?: string;
  wantedCategory?: string;
  recommendedMeetups?: any[];
  intentSummary?: string;
  alternatives?: {
    reason?: string;
    suggestions?: string[];
  };
  searchType?: string;
  userNeeds?: {
    immediate?: boolean;
    priceConscious?: boolean;
    locationSpecific?: boolean;
    moodRequirement?: string;
    cuisinePreference?: string[];
  };
}

const UniversalAISearchResultScreen: React.FC<UniversalAISearchResultScreenProps> = ({
  navigation,
  user,
  initialQuery = '',
  autoSearch = false,
  AnimatedText,
  GradientText,
  onSearchResult,
}) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [aiResponse, setAiResponse] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [displayedResponse, setDisplayedResponse] = useState('');

  const { fetchMeetups, meetups } = useMeetupStore();

  // Auto search on mount if enabled
  useEffect(() => {
    if (initialQuery && autoSearch) {
      setSearchQuery(initialQuery);
      handleAISearch(initialQuery);
    }
  }, [initialQuery, autoSearch]);

  // Typewriter effect for AI response
  useEffect(() => {
    if (aiResponse && !isTyping) {
      setIsTyping(true);
      setDisplayedResponse('');
      
      let currentIndex = 0;
      const typeWriter = () => {
        if (currentIndex <= aiResponse.length) {
          setDisplayedResponse(aiResponse.slice(0, currentIndex));
          currentIndex++;
          setTimeout(typeWriter, 30); // Typing speed
        } else {
          setIsTyping(false);
        }
      };
      
      typeWriter();
    }
  }, [aiResponse]);

  // Food category mapping for fallback search
  const foodSearchMap: { [key: string]: string[] } = {
    '라멘': ['라멘', '라면', '일본', '일식', 'ramen', '돈코츠', '미소', '쇼유'],
    '고기': ['고기', '삼겹살', '갈비', '스테이크', 'BBQ', '바베큐', '구이', '육류', '소고기', '돼지고기', '양고기', '곱창', '막창', '대창', '한우', '육회'],
    '피자': ['피자', 'pizza', '이탈리안', '양식', '도우'],
    '치킨': ['치킨', '닭', '프라이드', '양념', '후라이드', 'chicken', '초치', '초치모임', '치맥'],
    '회': ['회', '초밥', '스시', '사시미', '참치', '연어', '광어', '일식', '오마카세', 'sushi'],
    '파스타': ['파스타', '스파게티', '이탈리안', '양식', 'pasta'],
    '햄버거': ['햄버거', '버거', '수제버거', 'burger', '패티'],
    '중식': ['중식', '중국', '짜장', '짬뽕', '탕수육', '마라', '양꼬치'],
    '한식': ['한식', '김치', '찌개', '국밥', '비빔밥', '불고기', '된장', '전골'],
    '술': ['술', '주점', '호프', '이자카야', '포차', '막걸리', '소주', '맥주', '와인', '칵테일', '바'],
  };

  // Main AI search function with backend integration
  const handleAISearch = async (query: string) => {
    if (!query.trim()) {return;}
    
    setIsAnalyzing(true);
    setAiResponse('');
    setDisplayedResponse('');
    setAiAnalysis(null);
    setSearchResults([]);

    try {
      // Call AI search service - returns array of SearchResult
      const results = await aiSearchService.search(query);

      // results는 배열 형태로 반환됨
      if (results && results.length > 0) {
        const firstResult = results[0];
        setAiAnalysis(firstResult);

        // AI 분석 요약 표시
        if (firstResult.intentSummary) {
          setAiResponse(firstResult.intentSummary);
        }

        // 검색 결과가 있는 경우
        if (!firstResult.isNoMatch && firstResult.recommendedMeetups && firstResult.recommendedMeetups.length > 0) {
          setSearchResults(firstResult.recommendedMeetups);
          // intentSummary가 없으면 기본 메시지
          if (!firstResult.intentSummary) {
            setAiResponse(`🎉 "${query}"에 대한 ${firstResult.recommendedMeetups.length}개의 모임을 찾았습니다!`);
          }
        } else {
          // 검색 결과가 없는 경우
          if (firstResult.noMatchReason) {
            setAiResponse(firstResult.noMatchReason);
          } else if (!firstResult.intentSummary) {
            setAiResponse('검색 조건에 맞는 모임이 없습니다.');
          }
          // Fallback search
          await fallbackSearch(query);
        }

        // Set suggestions if available
        if (firstResult.alternatives && firstResult.alternatives.suggestions) {
          setSuggestions(firstResult.alternatives.suggestions);
        }

        // Call callback if provided
        if (onSearchResult) {
          onSearchResult(firstResult);
        }
      } else {
        throw new Error('검색 결과가 없습니다');
      }
    } catch (error) {
      console.error('AI 검색 오류:', error);
      setAiResponse('검색 중 오류가 발생했습니다. 다시 시도해주세요.');
      
      // Try fallback search
      await fallbackSearch(query);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Fallback search implementation
  const fallbackSearch = async (query: string) => {
    const queryLower = query.toLowerCase();
    
    // Price filter patterns
    const pricePatterns = {
      '무료': { min: 0, max: 0 },
      '1만원이하': { min: 0, max: 10000 },
      '1만원미만': { min: 0, max: 9999 },
      '1만원이상': { min: 10000, max: 999999 },
      '2만원이하': { min: 0, max: 20000 },
      '2만원이상': { min: 20000, max: 999999 },
    };

    // Check for price filters
    let priceFilter = null;
    for (const [pattern, range] of Object.entries(pricePatterns)) {
      if (queryLower.includes(pattern)) {
        priceFilter = range;
        break;
      }
    }

    // Check for food categories
    let categoryFilter = null;
    for (const [category, keywords] of Object.entries(foodSearchMap)) {
      if (keywords.some(keyword => queryLower.includes(keyword.toLowerCase()))) {
        categoryFilter = category;
        break;
      }
    }

    try {
      await fetchMeetups({
        category: categoryFilter,
        priceFilter,
        search: query,
      });
      
      setSearchResults(meetups);
    } catch (error) {
      console.error('Fallback search error:', error);
    }
  };

  // Handle new search
  const handleNewSearch = () => {
    if (searchQuery.trim()) {
      handleAISearch(searchQuery);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    handleAISearch(suggestion);
  };

  // Handle meetup card press
  const handleMeetupPress = (meetup: any) => {
    navigation.navigate('MeetupDetail', { meetupId: meetup.id });
  };

  // Render AI response section
  const renderAIResponse = () => {
    if (!aiResponse && !isAnalyzing) {return null;}

    return (
      <View style={styles.aiResponseContainer}>
        <View style={styles.aiHeader}>
          <Icon name="cpu" size={20} color={COLORS.primary.main} />
          <Text style={styles.aiTitle}>AI 분석 결과</Text>
        </View>
        
        {isAnalyzing ? (
          <View style={styles.analyzingContainer}>
            <ActivityIndicator size="small" color={COLORS.primary.main} />
            {GradientText ? (
              <GradientText style={styles.analyzingText}>
                분석 중...
              </GradientText>
            ) : (
              <Text style={styles.analyzingText}>분석 중...</Text>
            )}
          </View>
        ) : (
          <View style={styles.responseContainer}>
            {AnimatedText ? (
              <AnimatedText style={styles.responseText}>
                {displayedResponse}
              </AnimatedText>
            ) : (
              <Text style={styles.responseText}>{displayedResponse}</Text>
            )}
            
            {isTyping && (
              <View style={styles.cursorContainer}>
                <Text style={styles.cursor}>|</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  // Render search suggestions
  const renderSuggestions = () => {
    if (suggestions.length === 0) {return null;}

    return (
      <View style={styles.suggestionsContainer}>
        <Text style={styles.suggestionsTitle}>추천 검색어</Text>
        <View style={styles.suggestionsGrid}>
          {suggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionItem}
              onPress={() => handleSuggestionClick(suggestion)}
            >
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // Render AI reasons for a meetup
  const renderAIReasons = (meetup: any) => {
    if (!meetup.aiReasons || meetup.aiReasons.length === 0) {return null;}

    return (
      <View style={styles.aiReasonsContainer}>
        <View style={styles.aiReasonsHeader}>
          <Icon name="cpu" size={14} color={COLORS.primary.main} />
          <Text style={styles.aiReasonsTitle}>AI 추천 이유</Text>
          {meetup.aiScore && (
            <View style={styles.aiScoreBadge}>
              <Text style={styles.aiScoreText}>
                {meetup.aiScore >= 80 ? '⭐ ' : meetup.aiScore >= 60 ? '👍 ' : ''}
                매칭 {meetup.aiScore}점
              </Text>
            </View>
          )}
        </View>
        <View style={styles.aiReasonsList}>
          {meetup.aiReasons.slice(0, 3).map((reason: string, idx: number) => (
            <Text key={idx} style={styles.aiReasonItem}>
              {reason}
            </Text>
          ))}
        </View>
      </View>
    );
  };

  // Render search results
  const renderResults = () => {
    if (searchResults.length === 0 && !isAnalyzing) {
      return (
        <View style={styles.noResultsContainer}>
          <Icon name="search" size={48} color={COLORS.text.tertiary} />
          <Text style={styles.noResultsTitle}>검색 결과가 없습니다</Text>
          <Text style={styles.noResultsSubtitle}>
            다른 키워드로 검색해보세요
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>
          🎯 AI 추천 모임 ({searchResults.length}개)
        </Text>

        {searchResults.map((meetup, index) => (
          <View key={meetup.id || index} style={styles.meetupWithReasons}>
            {/* AI 추천 이유 카드 */}
            {renderAIReasons(meetup)}

            {/* 모임 카드 */}
            <MeetupCard
              meetup={meetup}
              onPress={handleMeetupPress}
            />
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>AI 검색</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Icon name="search" size={20} color={COLORS.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="AI에게 원하는 모임을 설명해보세요"
            placeholderTextColor={COLORS.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleNewSearch}
            returnKeyType="search"
          />
          <TouchableOpacity
            style={styles.searchButton}
            onPress={handleNewSearch}
            disabled={isAnalyzing}
          >
            <Text style={styles.searchButtonText}>검색</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderAIResponse()}
        {renderSuggestions()}
        {renderResults()}
      </ScrollView>
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  headerSpacer: {
    width: 24,
  },
  
  // Search container
  searchContainer: {
    backgroundColor: COLORS.neutral.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text.primary,
    marginLeft: 12,
    marginRight: 12,
  },
  searchButton: {
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  searchButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.neutral.white,
  },

  content: {
    flex: 1,
  },

  // AI Response section
  aiResponseContainer: {
    backgroundColor: COLORS.neutral.white,
    margin: 16,
    padding: 20,
    borderRadius: 16,
    ...SHADOWS.medium,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  aiTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginLeft: 8,
  },
  analyzingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  analyzingText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.primary.main,
    marginLeft: 12,
  },
  responseContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  responseText: {
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.text.primary,
    flex: 1,
  },
  cursorContainer: {
    marginLeft: 2,
  },
  cursor: {
    fontSize: 16,
    color: COLORS.primary.main,
    fontWeight: 'bold',
  },

  // Suggestions section
  suggestionsContainer: {
    backgroundColor: COLORS.neutral.white,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    ...SHADOWS.small,
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionItem: {
    backgroundColor: COLORS.neutral.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
  },
  suggestionText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },

  // Results section
  resultsContainer: {
    backgroundColor: COLORS.neutral.white,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    ...SHADOWS.small,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 16,
  },

  // No results
  noResultsContainer: {
    backgroundColor: COLORS.neutral.white,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },

  // Meetup with AI reasons wrapper
  meetupWithReasons: {
    marginBottom: 16,
  },

  // AI Reasons styles
  aiReasonsContainer: {
    backgroundColor: COLORS.primary.light + '20',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary.main,
  },
  aiReasonsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiReasonsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary.main,
    marginLeft: 6,
    flex: 1,
  },
  aiScoreBadge: {
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  aiScoreText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.neutral.white,
  },
  aiReasonsList: {
    gap: 4,
  },
  aiReasonItem: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.text.secondary,
    paddingLeft: 4,
  },
});

export default UniversalAISearchResultScreen;