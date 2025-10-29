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
            <View style={styles.locationIconContainer}>
              <Icon name="map-pin" size={16} color={COLORS.text.secondary} />
            </View>
            <View style={styles.locationTextContainer}>
              <Text style={styles.locationLabel}>현재 위치</Text>
              <Text style={styles.locationText}>{currentLocation}</Text>
            </View>
            <Icon name="chevron-down" size={14} color={COLORS.text.secondary} />
          </TouchableOpacity>
          
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconButton} onPress={() => navigation?.navigateToSearch()}>
              <View style={styles.iconContainer}>
                <Icon name="search" size={18} color={COLORS.text.secondary} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={() => console.log('알림')}>
              <View style={styles.iconContainer}>
                <Icon name="bell" size={18} color={COLORS.text.secondary} />
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationCount}>3</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 카테고리 그리드 */}
        <View style={styles.categorySection}>
          <View style={styles.categoryGrid}>
            {categories.map((category) => (
              <TouchableOpacity 
                key={category.id} 
                style={styles.categoryItem}
                onPress={() => navigation?.navigateToSearch()}
              >
                <View style={styles.categoryIconContainer}>
                  <Text style={styles.categoryIcon}>{category.emoji}</Text>
                </View>
                <Text style={styles.categoryName}>{category.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 가까운 모임 섹션 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🏃‍♂️ 가까운 모임</Text>
            <TouchableOpacity onPress={() => navigation?.navigateToSearch()}>
              <Text style={styles.moreButton}>더보기 ›</Text>
            </TouchableOpacity>
          </View>
          
          {meetups.map((meetup) => (
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
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2}}>
                      <Icon name="users" size={11} color={COLORS.text.secondary} />
                      <Text style={styles.meetupTime}>
                        {getMeetupStatus(meetup.date, meetup.time).label}
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
        </View>

        {/* 추천 모임 섹션 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>✨ 추천 모임</Text>
            <TouchableOpacity onPress={() => navigation?.navigateToSearch()}>
              <Text style={styles.moreButton}>더보기 ›</Text>
            </TouchableOpacity>
          </View>
          
          {meetups.slice(0, 3).map((meetup) => (
            <TouchableOpacity 
              key={`rec-${meetup.id}`} 
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
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2}}>
                      <Icon name="users" size={11} color={COLORS.text.secondary} />
                      <Text style={styles.meetupTime}>
                        {getMeetupStatus(meetup.date, meetup.time).label}
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
        </View>

        {/* 즐겨찾는 CTA 섹션 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>⭐ 즐겨찾는 기능</Text>
          </View>
          
          <View style={styles.ctaGrid}>
            <TouchableOpacity style={styles.ctaCard} onPress={() => navigation?.navigateToSearch()}>
              <Text style={styles.ctaIcon}>🔍</Text>
              <Text style={styles.ctaTitle}>내 주변 검색</Text>
              <Text style={styles.ctaDesc}>가까운 맛집과 모임을 찾아보세요</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.ctaCard} onPress={() => setShowCreateMeetup(true)}>
              <Text style={styles.ctaIcon}>➕</Text>
              <Text style={styles.ctaTitle}>모임 만들기</Text>
              <Text style={styles.ctaDesc}>새로운 모임을 생성해보세요</Text>
            </TouchableOpacity>
          </View>
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
    backgroundColor: '#f8f9fa',
    background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 0,
    ...SHADOWS.medium,
  },
  locationIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  locationIcon: {
    fontSize: 12,
  },
  locationTextContainer: {
    marginRight: 8,
  },
  locationLabel: {
    ...TYPOGRAPHY.location.secondary,
    color: '#5f6368',
  },
  locationText: {
    ...TYPOGRAPHY.location.primary,
    color: '#202124',
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
  categorySection: {
    paddingVertical: 20,
    marginBottom: 0,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  categoryItem: {
    width: '22%',
    alignItems: 'center',
    marginBottom: 20,
  },
  categoryIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 0,
    ...SHADOWS.small,
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  categoryIcon: {
    fontSize: 24,
  },
  categoryName: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  section: {
    marginBottom: 0,
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    ...TYPOGRAPHY.heading.h3,
  },
  moreButton: {
    ...TYPOGRAPHY.button.medium,
    color: COLORS.primary.main,
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
    ...TYPOGRAPHY.card.title,
    marginBottom: 6,
  },
  meetupMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  meetupLocation: {
    ...TYPOGRAPHY.card.meta,
    color: COLORS.text.secondary,
  },
  meetupTime: {
    ...TYPOGRAPHY.card.meta,
    color: COLORS.text.secondary,
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
    color: COLORS.text.secondary,
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
    backgroundColor: '#ffffff',
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
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary.main,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.large,
    shadowColor: 'rgba(102, 126, 234, 0.4)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 15,
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
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 0,
    ...SHADOWS.large,
    shadowColor: 'rgba(102, 126, 234, 0.3)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
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
});

export default HomeScreen;