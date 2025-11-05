import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
} from 'react-native';
import { useRouterNavigation } from '../components/RouterNavigation';
import {COLORS, SHADOWS, LAYOUT} from '../styles/colors';
import {TYPOGRAPHY} from '../styles/typography';
import {Icon} from '../components/Icon';
import CreateMeetupScreen from './CreateMeetupScreen';
import { useMeetups } from '../hooks/useMeetups';
import { FOOD_CATEGORIES } from '../constants/categories';
import { useNavigate } from 'react-router-dom';
import { formatKoreanDateTime, getMeetupStatus } from '../utils/dateUtils';

interface HomeScreenProps {
  navigateToLogin?: () => void;
  navigation?: any;
  user?: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigateToLogin, user }) => {
  const navigate = useNavigate();
  const navigation = useRouterNavigation();
  const [showCreateMeetup, setShowCreateMeetup] = useState(false);
  const [currentLocation, setCurrentLocation] = useState('위치 설정');
  const { meetups } = useMeetups();

  useEffect(() => {
    requestLocation();
  }, []);

  const requestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // 실제로는 역지오코딩 API를 사용해야 하지만, 임시로 고정값 사용
          setCurrentLocation('강남구');
        },
        () => {
          setCurrentLocation('강남구'); // 기본값
        }
      );
    } else {
      setCurrentLocation('강남구'); // 기본값
    }
  };

  const handleLocationChange = () => {
    Alert.alert(
      '위치 변경',
      '지역을 선택해주세요',
      [
        { text: '강남구', onPress: () => setCurrentLocation('강남구') },
        { text: '서초구', onPress: () => setCurrentLocation('서초구') },
        { text: '송파구', onPress: () => setCurrentLocation('송파구') },
        { text: '마포구', onPress: () => setCurrentLocation('마포구') },
        { text: '취소', style: 'cancel' }
      ]
    );
  };

  const categories = FOOD_CATEGORIES;

  return (
    <View style={styles.container}>
      {/* 고정 위치 헤더 */}
      <View style={styles.fixedLocationHeader}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.locationButton} onPress={handleLocationChange}>
            <Text style={styles.locationText}>{currentLocation}</Text>
            <Icon name="chevron-down" size={14} color={COLORS.text.primary} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.notificationIconButton} onPress={() => console.log('알림')}>
            <Icon name="bell" size={20} color={COLORS.text.primary} />
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationCount}>3</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 검색창 */}
        <View style={styles.searchContainer}>
          <TouchableOpacity 
            style={styles.searchBox}
            onPress={() => navigation?.navigateToSearch()}
          >
            <Icon name="search" size={16} color={COLORS.text.secondary} />
            <Text style={styles.searchPlaceholder}>모임을 검색해보세요</Text>
          </TouchableOpacity>
        </View>

        {/* 카테고리 그리드 */}
        <View style={styles.categorySection}>
          <View style={styles.categoryGrid}>
            <TouchableOpacity style={styles.categoryItem}>
              <View style={styles.categoryIconContainer}>
                <Text style={styles.categoryIcon}>🍚</Text>
              </View>
              <Text style={styles.categoryName}>한식</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.categoryItem}>
              <View style={styles.categoryIconContainer}>
                <Text style={styles.categoryIcon}>🥘</Text>
              </View>
              <Text style={styles.categoryName}>양식</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.categoryItem}>
              <View style={styles.categoryIconContainer}>
                <Text style={styles.categoryIcon}>🍜</Text>
              </View>
              <Text style={styles.categoryName}>중식</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.categoryItem}>
              <View style={styles.categoryIconContainer}>
                <Text style={styles.categoryIcon}>🍣</Text>
              </View>
              <Text style={styles.categoryName}>일식</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.categoryItem}>
              <View style={styles.categoryIconContainer}>
                <Text style={styles.categoryIcon}>☕</Text>
              </View>
              <Text style={styles.categoryName}>카페</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.categoryItem}>
              <View style={styles.categoryIconContainer}>
                <Text style={styles.categoryIcon}>🍻</Text>
              </View>
              <Text style={styles.categoryName}>술집</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.categoryItem}>
              <View style={styles.categoryIconContainer}>
                <Text style={styles.categoryIcon}>🍱</Text>
              </View>
              <Text style={styles.categoryName}>음식점</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.categoryItem}>
              <View style={styles.categoryIconContainer}>
                <Text style={styles.categoryIcon}>🏪</Text>
              </View>
              <Text style={styles.categoryName}>다른분류</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 빠른 링크 */}
        <View style={styles.quickLinksSection}>
          <TouchableOpacity style={styles.quickLink}>
            <Text style={styles.quickLinkText}>광고없이</Text>
          </TouchableOpacity>
        </View>

        {/* 인기 모임 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🔥 인기 모임</Text>
            <TouchableOpacity onPress={() => navigation?.navigateToSearch()}>
              <Text style={styles.moreButton}>더보기 ›</Text>
            </TouchableOpacity>
          </View>
          
          {meetups.length > 0 ? (
            <>
              {meetups.slice(0, 4).map((meetup) => (
                <TouchableOpacity 
                  key={meetup.id} 
                  style={styles.meetupCard}
                  onPress={() => navigate(`/meetup/${meetup.id}`)}
                >
                  <View style={styles.meetupHeader}>
                    <View style={styles.meetupTitleSection}>
                      <Text style={styles.meetupTitle}>{meetup.title}</Text>
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
                      <View style={[styles.statusBadge, { backgroundColor: getMeetupStatus(meetup.date, meetup.time).color }]}>
                        <Text style={styles.statusText}>{getMeetupStatus(meetup.date, meetup.time).label}</Text>
                      </View>
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
              ))}
              
              {meetups.length > 4 && (
                <View style={styles.moreIndicator}>
                  <Text style={styles.moreDots}>•••</Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.noMeetupsContainer}>
              <Text style={styles.noMeetupsText}>아직 등록된 모임이 없습니다</Text>
              <TouchableOpacity 
                style={styles.createFirstMeetupButton}
                onPress={() => setShowCreateMeetup(true)}
              >
                <Text style={styles.createFirstMeetupText}>첫 번째 모임 만들기</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 하단 기능 버튼들 */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.functionButton}>
            <Text style={styles.functionButtonText}>우리 지역 맛집을 알고 계신 분</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.functionButton}>
            <Text style={styles.functionButtonText}>오늘 가실 분이 계시는 분</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.functionButton}>
            <Text style={styles.functionButtonText}>오늘 18:30 이시는 분</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.functionButton}>
            <Text style={styles.functionButtonText}>포장과 집의 한끼</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.functionButton}>
            <Text style={styles.functionButtonText}>오늘 혼사여러 모시분에 모이는 한끼</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

    {/* Floating Action Button */}
    <TouchableOpacity 
      style={styles.fab}
      onPress={() => setShowCreateMeetup(true)}
    >
      <Icon name="plus" size={24} color={COLORS.text.white} />
    </TouchableOpacity>

    {/* 모임 만들기 모달 */}
    <Modal
      visible={showCreateMeetup}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setShowCreateMeetup(false)}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
        <CreateMeetupScreen onClose={() => setShowCreateMeetup(false)} />
      </View>
    </Modal>
  </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  fixedLocationHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    height: LAYOUT.HEADER_HEIGHT,
    paddingHorizontal: LAYOUT.HEADER_PADDING_HORIZONTAL,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    ...SHADOWS.small,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '100%',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  notificationIconButton: {
    position: 'relative',
    padding: 8,
  },
  locationArrow: {
    fontSize: 12,
    color: '#5f6368',
    marginLeft: 4,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 8,
  },
  iconContainer: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
  },
  searchIcon: {
    fontSize: 18,
  },
  notificationIcon: {
    fontSize: 18,
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ea4335',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  notificationCount: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    paddingTop: LAYOUT.HEADER_HEIGHT + LAYOUT.CONTENT_TOP_MARGIN,
    backgroundColor: 'transparent',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.neutral.background,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.white,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    ...SHADOWS.small,
  },
  searchPlaceholder: {
    fontSize: 16,
    color: COLORS.text.secondary,
    flex: 1,
  },
  categorySection: {
    backgroundColor: COLORS.neutral.white,
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryItem: {
    width: '22%',
    alignItems: 'center',
    marginBottom: 24,
  },
  categoryIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: COLORS.neutral.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    ...SHADOWS.small,
  },
  categoryIcon: {
    fontSize: 20,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  quickLinksSection: {
    backgroundColor: COLORS.neutral.white,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 8,
    alignItems: 'center',
  },
  quickLink: {
    backgroundColor: COLORS.primary.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    ...SHADOWS.small,
  },
  quickLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  section: {
    backgroundColor: COLORS.neutral.white,
    marginBottom: 10,
    padding: 20,
    ...SHADOWS.small,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2d3748',
    letterSpacing: -0.3,
  },
  moreButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
  },
  meetupCard: {
    backgroundColor: COLORS.neutral.white,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 20,
    borderWidth: 0,
    ...SHADOWS.medium,
    shadowColor: 'rgba(0,0,0,0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
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
  },
  meetupMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  meetupLocation: {
    fontSize: 13,
    color: '#718096',
    fontWeight: '500',
  },
  meetupTime: {
    fontSize: 13,
    color: '#718096',
    fontWeight: '500',
  },
  meetupStatus: {
    alignItems: 'flex-end',
  },
  statusText: {
    ...TYPOGRAPHY.label,
    color: COLORS.neutral.white,
    fontWeight: '600',
    fontSize: 10,
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
    color: '#718096',
    marginRight: 8,
    fontWeight: '500',
  },
  hostRating: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '500',
  },
  categoryBadge: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  categoryBadgeText: {
    fontSize: 10,
    color: '#718096',
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.large,
  },
  fabIcon: {
    fontSize: 24,
    color: COLORS.text.white,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    backgroundColor: COLORS.neutral.white,
    ...SHADOWS.small,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.neutral.grey200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: COLORS.text.primary,
    fontWeight: 'bold',
  },
  ctaGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  ctaCard: {
    flex: 1,
    backgroundColor: COLORS.primary.main,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 0,
    ...SHADOWS.large,
  },
  ctaIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  ctaTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text.white,
    marginBottom: 6,
    textAlign: 'center',
  },
  ctaDesc: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 18,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchCard: {
    backgroundColor: COLORS.secondary.light,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  searchTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 5,
  },
  searchSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  homeMainCard: {
    backgroundColor: COLORS.primary.light,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  homeMainTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 5,
  },
  homeMainSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryButton: {
    backgroundColor: COLORS.primary.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    ...SHADOWS.small,
  },
  categoryText: {
    fontSize: 14,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  meetupInfo: {
    justifyContent: 'space-between',
  },
  moreIndicator: {
    alignItems: 'center',
    marginVertical: 10,
  },
  moreDots: {
    fontSize: 20,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  recommendationCard: {
    backgroundColor: COLORS.primary.main,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    ...SHADOWS.medium,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.white,
    marginBottom: 5,
  },
  recommendationSubtitle: {
    fontSize: 14,
    color: COLORS.text.white,
    opacity: 0.9,
  },
  createMeetupCard: {
    backgroundColor: COLORS.secondary.main,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary.light,
    ...SHADOWS.medium,
  },
  createMeetupIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  createMeetupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 5,
    textAlign: 'center',
  },
  createMeetupSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  loginCard: {
    backgroundColor: COLORS.primary.accent,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  loginTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 5,
  },
  loginSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    opacity: 0.9,
  },
  functionButton: {
    backgroundColor: COLORS.neutral.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
  },
  functionButtonText: {
    fontSize: 14,
    color: COLORS.text.primary,
    textAlign: 'center',
    fontWeight: '500',
  },
  noMeetupsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noMeetupsText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  createFirstMeetupButton: {
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    ...SHADOWS.medium,
  },
  createFirstMeetupText: {
    fontSize: 14,
    color: COLORS.text.white,
    fontWeight: '600',
  },
});

export default HomeScreen;