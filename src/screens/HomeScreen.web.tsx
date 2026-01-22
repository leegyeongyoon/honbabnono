import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Image,
  TextInput,
} from 'react-native';
import { useNavigate } from 'react-router-dom';
import {COLORS, SHADOWS} from '../styles/colors';
import {Icon} from '../components/Icon';
import { NotificationBell } from '../components/NotificationBell';
import CreateMeetupWizard from './CreateMeetupWizard.web';
import NeighborhoodSelector from '../components/NeighborhoodSelector';
import MeetupCard from '../components/MeetupCard';
import locationService from '../services/locationService';
import { useUserStore } from '../store/userStore';
import { useMeetupStore } from '../store/meetupStore';
import { getTimeDifference } from '../utils/timeUtils';
import { FOOD_CATEGORIES } from '../constants/categories';
import AdvertisementBanner from '../components/AdvertisementBanner';
import { useMeetups } from '../hooks/useMeetups';
import { aiSearchService } from '../services/aiSearchService';
import riceCharacterImage from '../assets/images/rice-character.png';
import Popup from '../components/Popup';
import { usePopup } from '../hooks/usePopup';
import nativeBridge from '../utils/nativeBridge';

// 모임 시간 포맷팅 함수
const formatMeetupDateTime = (date: string, time: string) => {
  try {
    if (!date || !time) {return '시간 미정';}
    
    // ISO 문자열 형태로 변환
    const dateTimeStr = `${date}T${time}`;
    const dateObj = new Date(dateTimeStr);
    
    if (isNaN(dateObj.getTime())) {
      return `${date} ${time}`;
    }

    const month = dateObj.getMonth() + 1;
    const day = dateObj.getDate();
    const hours = dateObj.getHours();
    const minutes = dateObj.getMinutes();
    
    const ampm = hours >= 12 ? '오후' : '오전';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    
    return `${month}월 ${day}일 ${ampm} ${displayHours}:${minutes.toString().padStart(2, '0')}`;
  } catch (error) {
    console.error('formatMeetupDateTime error:', error);
    return `${date} ${time}`;
  }
};

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
  
  const handleNotificationTest = () => {
    try {
      console.log('🧪 [WEB DEBUG] handleNotificationTest 시작');
      console.log('🧪 [WEB DEBUG] nativeBridge.isNativeApp():', nativeBridge.isNativeApp());
      console.log('🧪 [WEB DEBUG] nativeBridge object:', nativeBridge);
      
      if (nativeBridge.isNativeApp()) {
        // 네이티브 앱에서 실행 중
        console.log('📱 [WEB DEBUG] 네이티브 앱에서 실행 중 - scheduleNotification 호출');
        nativeBridge.scheduleNotification(
          '혼밥노노 알림', 
          '5초 후 네이티브 알림입니다! 🍚', 
          5,
          { type: 'scheduled', timestamp: new Date().toISOString() }
        );
        alert('5초 후 네이티브 알림이 표시됩니다...');
      } else {
        // 웹 브라우저에서 실행 중
        console.log('🌐 [WEB DEBUG] 웹 브라우저에서 실행 중 - setTimeout 사용');
        setTimeout(() => {
          alert('5초 후 웹 알림입니다! 새로운 밥친구가 근처에 있어요 🍚');
        }, 5000);
        alert('5초 후 웹 알림이 표시됩니다...');
      }
      
      console.log('✅ [WEB DEBUG] 알림 예약 완료');
    } catch (error) {
      console.error('❌ [WEB DEBUG] 알림 예약 실패:', error);
      alert(`알림 예약 실패: ${error.message}`);
    }
  };

  const handleMeetupClick = (meetup: any) => {
    // Extract ID from meetup object
    const meetupId = typeof meetup === 'string' ? meetup : meetup.id;
    console.log('🎯 Clicking meetup:', { meetup, extractedId: meetupId });
    console.log('🎯 Meetup ID type:', typeof meetupId);
    navigate(`/meetup/${meetupId}`);
  };

  useEffect(() => {
    loadSavedNeighborhood();
    fetchHomeMeetups();
  }, []);

  useEffect(() => {
    console.log('🎯 Meetups data updated:', {
      length: meetups.length,
      meetups: meetups.map(m => ({ id: m.id, title: m.title }))
    });
    console.log('🎯 First meetup ID:', meetups[0]?.id);
    console.log('🎯 First 3 meetups for slice:', meetups.slice(0, 3).map(m => ({ id: m.id, title: m.title })));
  }, [meetups]);

  const loadSavedNeighborhood = () => {
    const saved = locationService.getUserNeighborhood();
    if (saved) {
      console.log('💾 Loaded saved neighborhood:', saved);
      setCurrentNeighborhood(saved);
    } else {
      console.log('🏠 Using default neighborhood');
      setCurrentNeighborhood({ district: '강남구', neighborhood: '역삼동' });
    }
  };

  const handleNeighborhoodSelect = (district: string, neighborhood: string) => {
    console.log('🏠 동네 선택됨:', { district, neighborhood });
    const newNeighborhood = { district, neighborhood };
    console.log('🏠 새로운 동네 설정:', newNeighborhood);
    setCurrentNeighborhood(newNeighborhood);
    locationService.saveUserNeighborhood(district, neighborhood);
    updateNeighborhood(district, neighborhood);
    console.log('🏠 동네 설정 완료');
  };


  // 검색 버튼 클릭 시 AI 검색 페이지로 이동하면서 자동 검색 실행
  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      navigate(`/ai-search?q=${encodeURIComponent(searchQuery)}&autoSearch=true`);
    }
  };

  // 검색 입력 처리
  const handleSearchInput = (text: string) => {
    setSearchQuery(text);
    setShowSearchSuggestions(text.length > 0);
  };

  // 엔터 키 입력 처리 - 바로 검색 실행
  const handleKeyPress = (e: any) => {
    if (e.key === 'Enter' || e.nativeEvent?.key === 'Enter') {
      e.preventDefault(); // 기본 엔터 동작 방지
      handleSearchSubmit();
    }
  };

  // 검색창 초기화
  const clearSearch = () => {
    setSearchQuery('');
    setShowSearchSuggestions(false);
  };

  // 검색 제안 사항
  const searchSuggestions = [
    '우울할때 갈만한 모임 추천해줘',
    '스트레스 받을 때 좋은 곳', 
    '혼자 갈 수 있는 카페',
    '맛있는 한식 모임',
    '저렴한 술집 모임',
    '새로운 사람들과 친해지기',
  ];

  // 제안 클릭 처리
  const handleSuggestionPress = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSearchSuggestions(false);
    setTimeout(() => {
      handleSearchSubmit();
    }, 100);
  };

  const getCategoryEmoji = (categoryName: string) => {
    const category = FOOD_CATEGORIES.find(cat => cat.name === categoryName);
    return category ? category.emoji : '🍴';
  };

  const getCategoryColor = (categoryName: string) => {
    const category = FOOD_CATEGORIES.find(cat => cat.name === categoryName);
    return category ? category.color : COLORS.primary.main;
  };


  const openNeighborhoodSelector = () => {
    console.log('🏠 [HomeScreen] 동네 선택 버튼 클릭됨');
    console.log('🏠 [HomeScreen] showNeighborhoodSelector 현재 상태:', showNeighborhoodSelector);
    setShowNeighborhoodSelector(true);
    console.log('🏠 [HomeScreen] showNeighborhoodSelector을 true로 설정함');
  };

  return (
    <View style={styles.container}>
      {/* 상단 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.locationButton} onPress={openNeighborhoodSelector}>
          <Text style={styles.locationText}>
            {currentNeighborhood ? `${currentNeighborhood.district} ${currentNeighborhood.neighborhood}` : '신도림역[2호선] 3번출구'}
          </Text>
          <Icon name="chevron-down" size={14} color={COLORS.text.primary} />
        </TouchableOpacity>
        
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.testButton}
            onPress={handleNotificationTest}
          >
            <Text style={styles.testButtonText}>알림테스트</Text>
          </TouchableOpacity>
          
          <NotificationBell
            userId={user?.id?.toString()}
            onPress={() => {
              console.log('🔔 알림 버튼 클릭됨');
              console.log('📍 navigation 객체:', navigation);
              console.log('📍 navigation 메서드들:', Object.keys(navigation || {}));
            if (navigation?.navigateToNotifications) {
              navigation.navigateToNotifications();
            } else if (navigation?.navigate) {
              navigation.navigate('Notifications');
            } else {
              console.warn('navigation.navigateToNotifications가 없습니다');
            }
          }}
          color={COLORS.text.primary}
          size={20}
        />
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* AI 검색창 */}
        <View style={styles.searchContainer}>
          {/* AI 검색 라벨 */}
          <View style={styles.aiSearchLabel}>
            <View style={styles.aiIcon}>
              <Image 
                source={{ uri: riceCharacterImage }}
                style={{ width: 32, height: 32 }}
                resizeMode="cover"
                onError={() => {
                  // 폴백으로 이모지 사용
                }}
              />
            </View>
            <Text style={styles.aiLabelText}>AI 스마트 검색</Text>
            <View style={styles.aiStatusDot} />
          </View>
          
          <View style={styles.searchBox}>
            <Icon name="search" size={16} color={COLORS.text.secondary} />
            <TextInput 
              style={styles.searchInput}
              placeholder="AI에게 원하는 모임을 자유롭게 말해보세요..."
              value={searchQuery}
              onChangeText={handleSearchInput}
              onKeyPress={handleKeyPress}
              onFocus={() => setShowSearchSuggestions(searchQuery.length > 0)}
              onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 150)}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <>
                <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                  <Icon name="times" size={16} color={COLORS.text.secondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSearchSubmit} style={styles.searchButtonEnhanced}>
                  <Icon name="search" size={14} color={COLORS.neutral.white} />
                  <Text style={styles.searchButtonText}>검색</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
          
          {/* 검색 제안 */}
          {showSearchSuggestions && (
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsLabel}>🍚 AI 검색 제안</Text>
              <View style={styles.suggestionsList}>
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
                      <Text style={styles.suggestionText}>{suggestion}</Text>
                    </TouchableOpacity>
                  ))}
              </View>
            </View>
          )}
        </View>

        {/* 카테고리 그리드 */}
        <View style={styles.categorySection}>
          <View style={styles.categoryGrid}>
            {FOOD_CATEGORIES.map((category, index) => (
              <TouchableOpacity 
                key={category.id} 
                style={styles.categoryItem}
                onPress={() => navigate('/meetups', { state: { category: category.name } })}
              >
                <View style={[styles.categoryBox, { backgroundColor: category.bgColor }]}>
                  <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                </View>
                <Text style={styles.categoryName}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 광고 섹션 */}
        <AdvertisementBanner position="home_banner" navigation={navigation} />


        {/* 바로 참여할 수 있는 번개 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>바로 참여할 수 있는 번개</Text>
        
        {meetups.length > 0 && meetups.slice(0, 3).map((meetup, index) => {
          console.log('🎯 Rendering meetup:', { index, id: meetup.id, title: meetup.title, type: typeof meetup.id });
          if (!meetup.id) {
            console.error('🚨 ERROR: Meetup has no ID!', meetup);
            return null;
          }
          return (
            <MeetupCard 
              key={meetup.id}
              meetup={meetup}
              onPress={handleMeetupClick}
            />
          );
        })}
        </View>

        {/* 오늘은 컵스밥! */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>오늘은 컵스밥!</Text>
        
        {meetups.length > 3 && meetups.slice(3, 6).map((meetup, index) => {
          console.log('🎯 Rendering meetup section 2:', { index, id: meetup.id, title: meetup.title, type: typeof meetup.id });
          if (!meetup.id) {
            console.error('🚨 ERROR: Meetup section 2 has no ID!', meetup);
            return null;
          }
          return (
            <MeetupCard 
              key={meetup.id}
              meetup={meetup}
              onPress={handleMeetupClick}
            />
          );
        })}

        {/* 더보기 버튼 */}
        <TouchableOpacity 
          style={styles.moreButton}
          onPress={() => navigate('/meetup-list')}
        >
          <Text style={styles.moreText}>모든 모임 보기</Text>
          <Text style={styles.moreArrow}>→</Text>
        </TouchableOpacity>
        </View>

        {/* 하단 여백 */}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* 플로팅 버튼 */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowCreateMeetup(true)}>
        <Icon name="plus" size={28} color={COLORS.neutral.white} />
      </TouchableOpacity>


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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 52,
    backgroundColor: COLORS.neutral.white,
    ...SHADOWS.small,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
    backgroundColor: COLORS.primary.light,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary.main,
  },
  locationText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  notificationButton: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: COLORS.neutral.background,
  },
  scrollView: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: COLORS.neutral.white,
  },
  aiSearchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  aiIcon: {
    width: 24,
    height: 24,
    backgroundColor: `${COLORS.primary.main}20`,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiLabelText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  aiStatusDot: {
    width: 6,
    height: 6,
    backgroundColor: '#4ade80',
    borderRadius: 3,
    marginLeft: 'auto',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.background,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
    borderWidth: 2,
    borderColor: `${COLORS.primary.main}30`,
    shadowColor: COLORS.primary.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  searchPlaceholder: {
    fontSize: 14,
    color: COLORS.text.secondary,
    flex: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    border: 'none',
    backgroundColor: 'transparent',
    color: COLORS.text.primary,
    marginLeft: 10,
  },
  categorySection: {
    backgroundColor: COLORS.neutral.white,
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
    gap: 8,
  },
  categoryItem: {
    width: '22.5%',
    alignItems: 'center',
    marginBottom: 20,
  },
  categoryBox: {
    width: 70,
    height: 70,
    borderRadius: 16,
    backgroundColor: COLORS.neutral.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
  },
  categoryEmoji: {
    fontSize: 36,
  },
  categoryIcon: {
    width: 40,
    height: 40,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  adBanner: {
    backgroundColor: COLORS.neutral.background,
    paddingVertical: 24,
    alignItems: 'center',
    marginVertical: 12,
    borderRadius: 12,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
  },
  adText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.secondary,
  },
  section: {
    backgroundColor: COLORS.neutral.white,
    marginBottom: 12,
    paddingVertical: 20,
    borderRadius: 16,
    marginHorizontal: 20,
    ...SHADOWS.small,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text.primary,
    paddingHorizontal: 20,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  meetupItem: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
    alignItems: 'flex-start',
  },
  foodImageContainer: {
    marginRight: 12,
  },
  foodImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: COLORS.neutral.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
  },
  foodImageSample: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: COLORS.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary.main,
  },
  foodEmoji: {
    fontSize: 32,
  },
  meetupImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    objectFit: 'cover',
  },
  meetupContent: {
    flex: 1,
  },
  meetupTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  meetupDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 10,
    lineHeight: 20,
  },
  meetupTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  categoryTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  priceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.functional.success + '20',
    gap: 4,
  },
  priceTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.functional.success,
  },
  ageTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.text.secondary + '20',
    gap: 4,
  },
  ageTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  genderTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.primary.main + '20',
    gap: 4,
  },
  genderTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary.main,
  },
  meetupDetails: {
    marginBottom: 8,
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: COLORS.text.primary,
    fontWeight: '500',
    flex: 1,
  },
  meetupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  metaTimeBlue: {
    fontSize: 13,
    color: COLORS.primary.main,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.large,
    shadowColor: COLORS.primary.main + '4D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 12,
  },
  bottomPadding: {
    height: 20,
  },
  moreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.neutral.background,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
  },
  moreText: {
    fontSize: 15,
    color: COLORS.text.primary,
    fontWeight: '600',
    marginRight: 6,
  },
  moreArrow: {
    fontSize: 15,
    color: COLORS.text.primary,
    fontWeight: 'bold',
  },
  // 필터 뱃지 스타일
  filterBadgeContainer: {
    backgroundColor: COLORS.neutral.white,
    paddingVertical: 20,
    paddingHorizontal: 0,
    marginBottom: 12,
    borderRadius: 16,
    marginHorizontal: 20,
    ...SHADOWS.medium,
  },
  filterBadgeScroll: {
    paddingHorizontal: 20,
  },
  filterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 2,
    backgroundColor: 'white',
    marginRight: 10,
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  activeBadge: {
    backgroundColor: COLORS.primary.main,
    borderColor: COLORS.primary.main,
  },
  priceBadge: {
    borderColor: COLORS.functional.success,
  },
  activePriceBadge: {
    backgroundColor: COLORS.functional.success,
    borderColor: COLORS.functional.success,
  },
  filterBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  activeBadgeText: {
    color: 'white',
  },
  clearFilterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.neutral.grey100,
    marginRight: 8,
    gap: 6,
  },
  clearFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  categorySectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: COLORS.neutral.grey100,
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  selectedCategoryBox: {
    borderWidth: 2,
    borderColor: COLORS.primary.main,
  },
  selectedCategoryName: {
    color: COLORS.primary.main,
    fontWeight: '700',
  },
  adSection: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  adBanner: {
    backgroundColor: '#FF6B6B',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  adTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.neutral.white,
    marginBottom: 8,
    textAlign: 'center',
  },
  adDescription: {
    fontSize: 14,
    color: COLORS.neutral.white,
    marginBottom: 16,
    textAlign: 'center',
    opacity: 0.9,
  },
  adButton: {
    backgroundColor: COLORS.neutral.white,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  adButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  // 검색 관련 스타일
  clearButton: {
    padding: 4,
  },
  searchLoadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  searchLoadingText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontStyle: 'italic',
  },
  suggestionsContainer: {
    marginTop: 12,
    backgroundColor: COLORS.neutral.white,
    borderRadius: 16,
    padding: 16,
    ...SHADOWS.small,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
  },
  suggestionsLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary.main,
    marginBottom: 12,
  },
  suggestionsList: {
    flexDirection: 'column',
    gap: 8,
  },
  suggestionItem: {
    backgroundColor: COLORS.neutral.background,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${COLORS.primary.main}20`,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.small,
    shadowColor: COLORS.primary.main,
  },
  suggestionText: {
    fontSize: 13,
    color: COLORS.text.primary,
    fontWeight: '500',
    flex: 1,
  },
  searchResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  clearSearchButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.neutral.grey100,
    borderRadius: 16,
  },
  clearSearchText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  noResultsContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: COLORS.neutral.grey50,
    borderRadius: 12,
    margin: 20,
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },
  // 검색 버튼 스타일
  searchButton: {
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 6,
  },
  searchButtonEnhanced: {
    backgroundColor: COLORS.primary.main,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 8,
    gap: 6,
    ...SHADOWS.small,
  },
  searchButtonText: {
    color: COLORS.neutral.white,
    fontSize: 12,
    fontWeight: '600',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  testButton: {
    backgroundColor: COLORS.functional.warning,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    ...SHADOWS.small,
  },
  testButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.white,
  },
});

export default HomeScreen;