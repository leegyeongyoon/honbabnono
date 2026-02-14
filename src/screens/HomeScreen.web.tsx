import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, SHADOWS, LAYOUT, CSS_SHADOWS } from '../styles/colors';
import { TYPOGRAPHY, FONT_WEIGHTS } from '../styles/typography';
import { SPACING, BORDER_RADIUS } from '../styles/spacing';
import { Icon } from '../components/Icon';
import { NotificationBell } from '../components/NotificationBell';
import CreateMeetupWizard from './CreateMeetupWizard.web';
import NeighborhoodSelector from '../components/NeighborhoodSelector';
import MeetupCard from '../components/MeetupCard';
import locationService from '../services/locationService';
import { useUserStore } from '../store/userStore';
import { useMeetupStore } from '../store/meetupStore';
import { FOOD_CATEGORIES } from '../constants/categories';
import AdvertisementBanner from '../components/AdvertisementBanner';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { useMeetups } from '../hooks/useMeetups';

interface HomeScreenProps {
  navigateToLogin?: () => void;
  navigation?: any;
  user?: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigateToLogin, navigation, user: propUser }) => {
  const navigate = useNavigate();
  const { updateNeighborhood, user } = useUserStore();
  const { meetups, fetchHomeMeetups } = useMeetupStore();
  const { searchMeetups, meetups: searchResults, loading: searchLoading } = useMeetups();
  const [showCreateMeetup, setShowCreateMeetup] = useState(false);
  const [showNeighborhoodSelector, setShowNeighborhoodSelector] = useState(false);
  const [currentNeighborhood, setCurrentNeighborhood] = useState<{ district: string; neighborhood: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [fabHovered, setFabHovered] = useState(false);

  const handleMeetupClick = (meetup: any) => {
    const meetupId = typeof meetup === 'string' ? meetup : meetup.id;
    navigate(`/meetup/${meetupId}`);
  };

  useEffect(() => {
    loadSavedNeighborhood();
    setFetchError(false);
    fetchHomeMeetups()
      .catch(() => setFetchError(true))
      .finally(() => setIsLoading(false));
  }, []);

  const loadSavedNeighborhood = () => {
    const saved = locationService.getUserNeighborhood();
    if (saved) {
      setCurrentNeighborhood(saved);
    } else {
      setCurrentNeighborhood({ district: '강남구', neighborhood: '역삼동' });
    }
  };

  const handleNeighborhoodSelect = (district: string, neighborhood: string) => {
    const newNeighborhood = { district, neighborhood };
    setCurrentNeighborhood(newNeighborhood);
    locationService.saveUserNeighborhood(district, neighborhood);
    updateNeighborhood(district, neighborhood);
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      navigate(`/ai-search?q=${encodeURIComponent(searchQuery)}&autoSearch=true`);
    }
  };

  const handleSearchInput = (text: string) => {
    setSearchQuery(text);
    setShowSearchSuggestions(text.length > 0);
  };

  const handleKeyPress = (e: any) => {
    if (e.key === 'Enter' || e.nativeEvent?.key === 'Enter') {
      e.preventDefault();
      handleSearchSubmit();
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setShowSearchSuggestions(false);
  };

  const searchSuggestions = [
    '우울할때 갈만한 모임 추천해줘',
    '스트레스 받을 때 좋은 곳',
    '혼자 갈 수 있는 카페',
    '맛있는 한식 모임',
    '저렴한 술집 모임',
    '새로운 사람들과 친해지기',
  ];

  const handleSuggestionPress = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSearchSuggestions(false);
    setTimeout(() => {
      handleSearchSubmit();
    }, 100);
  };

  const openNeighborhoodSelector = () => {
    setShowNeighborhoodSelector(true);
  };

  const handleRetry = () => {
    setIsLoading(true);
    setFetchError(false);
    fetchHomeMeetups()
      .catch(() => setFetchError(true))
      .finally(() => setIsLoading(false));
  };

  // 섹션별 모임 데이터 분류
  const instantMeetups = meetups.slice(0, 4);
  const popularMeetups = meetups.slice(2, 6);
  const nearbyMeetups = meetups.slice(1, 5);
  const todayMeetups = meetups.slice(3, 7);

  return (
    <View style={styles.container}>
      {/* 고정 헤더 (72px) */}
      <View style={styles.header}>
        <Text style={styles.headerLogo}>혼밥시러</Text>

        <TouchableOpacity style={styles.locationButton} onPress={openNeighborhoodSelector}>
          <Icon name="map-pin" size={14} color={COLORS.primary.main} />
          <Text style={styles.locationText}>
            {currentNeighborhood ? `${currentNeighborhood.neighborhood}` : '역삼동'}
          </Text>
          <Icon name="chevron-down" size={12} color={COLORS.text.tertiary} />
        </TouchableOpacity>

        <View style={styles.headerRight}>
          <NotificationBell
            userId={user?.id?.toString()}
            onPress={() => {
              if (navigation?.navigateToNotifications) {
                navigation.navigateToNotifications();
              } else if (navigation?.navigate) {
                navigation.navigate('Notifications');
              }
            }}
            color={COLORS.text.primary}
            size={22}
          />
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 검색 바 */}
        <View style={styles.searchSection}>
          <TouchableOpacity
            style={styles.searchBar}
            activeOpacity={0.8}
          >
            <Icon name="search" size={16} color={COLORS.text.tertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="어떤 모임을 찾고 계세요?"
              placeholderTextColor={COLORS.text.tertiary}
              value={searchQuery}
              onChangeText={handleSearchInput}
              onKeyPress={handleKeyPress}
              onFocus={() => setShowSearchSuggestions(searchQuery.length > 0)}
              onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 150)}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              aria-label="모임 검색"
            />
            {searchQuery.length > 0 && (
              <>
                <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                  <Icon name="times" size={14} color={COLORS.text.tertiary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSearchSubmit} style={styles.searchSubmitButton}>
                  <Icon name="search" size={12} color={COLORS.neutral.white} />
                </TouchableOpacity>
              </>
            )}
          </TouchableOpacity>

          {/* 검색 제안 드롭다운 */}
          {showSearchSuggestions && (
            <View style={styles.suggestionsDropdown}>
              <Text style={styles.suggestionsLabel}>AI 검색 제안</Text>
              {searchSuggestions
                .filter(suggestion =>
                  searchQuery.length === 0 ||
                  suggestion.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .slice(0, 4)
                .map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionItem}
                    onPress={() => handleSuggestionPress(suggestion)}
                  >
                    <Icon name="search" size={12} color={COLORS.text.tertiary} />
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
            </View>
          )}
        </View>

        {/* 카테고리 그리드 (4x2) */}
        <View style={styles.categorySection}>
          <View style={styles.categoryGrid}>
            {FOOD_CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryItem}
                onPress={() => navigate('/meetups', { state: { category: category.name } })}
                activeOpacity={0.7}
                accessibilityLabel={category.name}
              >
                <View style={styles.categoryIconBox}>
                  <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                </View>
                <Text style={styles.categoryName}>{category.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 광고 배너 */}
        <AdvertisementBanner position="home_banner" navigation={navigation} />

        {/* 섹션 1: 지금 바로 참여할 수 있는 번개 */}
        <View style={styles.contentSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>지금 바로 참여할 수 있는 번개</Text>
            <TouchableOpacity onPress={() => navigate('/meetup-list')}>
              <Text style={styles.seeAllText}>더보기</Text>
            </TouchableOpacity>
          </View>
          {isLoading ? (
            <SkeletonCardRow />
          ) : fetchError ? (
            <ErrorState onRetry={handleRetry} />
          ) : instantMeetups.length === 0 ? (
            <EmptyState
              compact
              icon="🍽️"
              title="아직 즉석 모임이 없어요"
              description="첫 번째 모임을 만들어보세요!"
              actionLabel="모임 만들기"
              onAction={() => setShowCreateMeetup(true)}
            />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalCardList}
            >
              {instantMeetups.map((meetup) => {
                if (!meetup.id) return null;
                return (
                  <View key={meetup.id} style={styles.horizontalCardWrapper}>
                    <MeetupCard
                      meetup={meetup}
                      onPress={handleMeetupClick}
                    />
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* 섹션 2: 요즘 가장 인기 있는 메뉴 */}
        <View style={styles.contentSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>요즘 가장 인기 있는 메뉴</Text>
            <TouchableOpacity onPress={() => navigate('/meetup-list')}>
              <Text style={styles.seeAllText}>더보기</Text>
            </TouchableOpacity>
          </View>
          {isLoading ? (
            <SkeletonCardRow />
          ) : fetchError ? (
            <ErrorState onRetry={handleRetry} />
          ) : popularMeetups.length === 0 ? (
            <EmptyState
              compact
              icon="🔥"
              title="인기 메뉴가 아직 없어요"
              description="모임에 참여하고 인기 메뉴를 만들어보세요"
            />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalCardList}
            >
              {popularMeetups.map((meetup) => {
                if (!meetup.id) return null;
                return (
                  <View key={meetup.id} style={styles.horizontalCardWrapper}>
                    <MeetupCard
                      meetup={meetup}
                      onPress={handleMeetupClick}
                    />
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* 섹션 3: 도보 15분 이내의 번개 */}
        <View style={styles.contentSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>도보 15분 이내의 번개</Text>
            <TouchableOpacity onPress={() => navigate('/meetup-list')}>
              <Text style={styles.seeAllText}>더보기</Text>
            </TouchableOpacity>
          </View>
          {isLoading ? (
            <SkeletonCardRow />
          ) : fetchError ? (
            <ErrorState onRetry={handleRetry} />
          ) : nearbyMeetups.length === 0 ? (
            <EmptyState
              compact
              icon="📍"
              title="근처에 모임이 없어요"
              description="동네를 변경하거나 새 모임을 만들어보세요"
              actionLabel="모임 만들기"
              onAction={() => setShowCreateMeetup(true)}
            />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalCardList}
            >
              {nearbyMeetups.map((meetup) => {
                if (!meetup.id) return null;
                return (
                  <View key={meetup.id} style={styles.horizontalCardWrapper}>
                    <MeetupCard
                      meetup={meetup}
                      onPress={handleMeetupClick}
                    />
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* 섹션 4: 오늘 점심/저녁 번개 */}
        <View style={styles.contentSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>오늘 점심/저녁 번개</Text>
            <TouchableOpacity onPress={() => navigate('/meetup-list')}>
              <Text style={styles.seeAllText}>더보기</Text>
            </TouchableOpacity>
          </View>
          {isLoading ? (
            <SkeletonCardRow />
          ) : fetchError ? (
            <ErrorState onRetry={handleRetry} />
          ) : todayMeetups.length === 0 ? (
            <EmptyState
              compact
              icon="☀️"
              title="오늘 예정된 모임이 없어요"
              description="지금 바로 오늘의 모임을 만들어보세요!"
              actionLabel="모임 만들기"
              onAction={() => setShowCreateMeetup(true)}
            />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalCardList}
            >
              {todayMeetups.map((meetup) => {
                if (!meetup.id) return null;
                return (
                  <View key={meetup.id} style={styles.horizontalCardWrapper}>
                    <MeetupCard
                      meetup={meetup}
                      onPress={handleMeetupClick}
                    />
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* 모든 모임 보기 버튼 */}
        <TouchableOpacity
          style={styles.allMeetupsButton}
          onPress={() => navigate('/meetup-list')}
          activeOpacity={0.7}
        >
          <Text style={styles.allMeetupsText}>모든 모임 보기</Text>
          <Icon name="chevron-right" size={16} color={COLORS.primary.main} />
        </TouchableOpacity>

        {/* 하단 여백 */}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* FAB - Enhanced */}
      <div
        onClick={() => setShowCreateMeetup(true)}
        onMouseEnter={() => setFabHovered(true)}
        onMouseLeave={() => setFabHovered(false)}
        style={{
          position: 'fixed',
          bottom: 80,
          right: 20,
          height: 60,
          minWidth: 60,
          paddingLeft: fabHovered ? 20 : 0,
          paddingRight: fabHovered ? 20 : 0,
          borderRadius: 30,
          backgroundColor: COLORS.text.primary,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: fabHovered ? 8 : 0,
          boxShadow: CSS_SHADOWS.large,
          cursor: 'pointer',
          zIndex: 1000,
          transition: 'all 200ms ease',
          transform: fabHovered ? 'scale(1.05)' : 'scale(1)',
        }}
        role="button"
        aria-label="새 모임 만들기"
      >
        <span style={{ fontSize: 24, color: COLORS.text.white }}>+</span>
        {fabHovered && (
          <span style={{
            fontSize: 14,
            fontWeight: '600',
            color: COLORS.text.white,
            whiteSpace: 'nowrap',
          }}>
            모임 만들기
          </span>
        )}
      </div>

      {/* 모달들 */}
      <Modal
        visible={showCreateMeetup}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <CreateMeetupWizard
          user={user}
          onClose={() => setShowCreateMeetup(false)}
        />
      </Modal>

      <NeighborhoodSelector
        visible={showNeighborhoodSelector}
        onClose={() => setShowNeighborhoodSelector(false)}
        onSelect={handleNeighborhoodSelect}
        currentNeighborhood={currentNeighborhood}
      />
    </View>
  );
};

// 스켈레톤 로딩 UI 컴포넌트
const SkeletonCardRow: React.FC = () => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.horizontalCardList}
  >
    {[1, 2, 3].map((i) => (
      <View key={i} style={styles.skeletonCard}>
        <View style={styles.skeletonImage} />
        <View style={styles.skeletonContent}>
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonLine} />
          <View style={styles.skeletonLineShort} />
        </View>
      </View>
    ))}
  </ScrollView>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },

  // ─── 헤더 ─────────────────────────────────────────
  header: {
    height: LAYOUT.HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
    gap: SPACING.md,
  },
  headerLogo: {
    ...TYPOGRAPHY.heading.h2,
    color: COLORS.primary.main,
    fontWeight: FONT_WEIGHTS.bold as any,
    letterSpacing: -0.5,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.neutral.background,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
  },
  locationText: {
    ...TYPOGRAPHY.location.primary,
  },
  headerRight: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },

  // ─── 스크롤 영역 ─────────────────────────────────────
  scrollView: {
    flex: 1,
  },

  // ─── 검색 바 ─────────────────────────────────────────
  searchSection: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.neutral.white,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: COLORS.neutral.background,
    borderRadius: BORDER_RADIUS.xxl,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
    ...SHADOWS.small,
  },
  searchInput: {
    flex: 1,
    ...TYPOGRAPHY.input,
    border: 'none',
    backgroundColor: 'transparent',
  },
  clearButton: {
    padding: SPACING.xs,
  },
  searchSubmitButton: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─── 검색 제안 ─────────────────────────────────────
  suggestionsDropdown: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.neutral.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.medium,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
  },
  suggestionsLabel: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.primary.main,
    fontWeight: FONT_WEIGHTS.semiBold as any,
    marginBottom: SPACING.md,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
  },
  suggestionText: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.primary,
  },

  // ─── 카테고리 그리드 ─────────────────────────────────
  categorySection: {
    backgroundColor: COLORS.neutral.white,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.sm,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: SPACING.lg,
  },
  categoryItem: {
    width: '23%',
    alignItems: 'center',
  },
  categoryIconBox: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.neutral.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
    ...SHADOWS.small,
  },
  categoryEmoji: {
    fontSize: 28,
  },
  categoryName: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.primary,
    fontWeight: FONT_WEIGHTS.medium as any,
    textAlign: 'center',
  },

  // ─── 콘텐츠 섹션 ─────────────────────────────────────
  contentSection: {
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.heading.h3,
    color: COLORS.text.primary,
  },
  seeAllText: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.tertiary,
    fontWeight: FONT_WEIGHTS.medium as any,
  },
  horizontalCardList: {
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },
  horizontalCardWrapper: {
    width: 280,
  },

  // ─── 모든 모임 보기 버튼 ─────────────────────────────
  allMeetupsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.xl,
    marginVertical: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.neutral.white,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
    ...SHADOWS.small,
  },
  allMeetupsText: {
    ...TYPOGRAPHY.button.medium,
    color: COLORS.primary.main,
  },

  // ─── 하단 여백 ───────────────────────────────────────
  bottomPadding: {
    height: SPACING.xxxl,
  },

  // ─── 스켈레톤 로딩 ───────────────────────────────────
  skeletonCard: {
    width: 280,
    backgroundColor: COLORS.neutral.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    flexDirection: 'row',
    gap: SPACING.md,
    ...SHADOWS.small,
  },
  skeletonImage: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.neutral.grey100,
  },
  skeletonContent: {
    flex: 1,
    gap: SPACING.sm,
    justifyContent: 'center',
  },
  skeletonTitle: {
    height: 16,
    width: '80%',
    backgroundColor: COLORS.neutral.grey100,
    borderRadius: BORDER_RADIUS.xs,
  },
  skeletonLine: {
    height: 12,
    width: '60%',
    backgroundColor: COLORS.neutral.grey100,
    borderRadius: BORDER_RADIUS.xs,
  },
  skeletonLineShort: {
    height: 12,
    width: '40%',
    backgroundColor: COLORS.neutral.grey100,
    borderRadius: BORDER_RADIUS.xs,
  },
});

export default HomeScreen;
