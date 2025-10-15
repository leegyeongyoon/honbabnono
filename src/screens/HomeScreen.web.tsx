import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
} from 'react-native';
import {useTypedNavigation} from '../hooks/useWebNavigation';
import {COLORS, SHADOWS} from '../styles/colors';
import CreateMeetupScreen from './CreateMeetupScreen';
import { useMeetups } from '../hooks/useMeetups';

interface HomeScreenProps {
  navigateToLogin?: () => void;
  navigation?: any;
  user?: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigateToLogin, navigation, user }) => {
  const [showCreateMeetup, setShowCreateMeetup] = useState(false);
  const { meetups } = useMeetups();

  return (
    <View style={styles.container}>
    <ScrollView style={styles.scrollView}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>혼자 밥 먹기 싫어요! 🍽️</Text>
            <Text style={styles.subtitle}>따뜻한 사람들과 함께하는 맛있는 식사</Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={() => console.log('알림 화면으로 이동')}
            >
              <Text style={styles.notificationIcon}>🔔</Text>
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationCount}>3</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 퀵 액션 버튼들 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚀 빠른 시작</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation?.navigateToSearch()}
          >
            <Text style={styles.quickActionIcon}>🔍</Text>
            <Text style={styles.quickActionText}>모임 찾기</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => console.log('내 주변 모임')}
          >
            <Text style={styles.quickActionIcon}>📍</Text>
            <Text style={styles.quickActionText}>내 주변</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => console.log('추천 모임')}
          >
            <Text style={styles.quickActionIcon}>✨</Text>
            <Text style={styles.quickActionText}>추천</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => console.log('내 모임')}
          >
            <Text style={styles.quickActionIcon}>👥</Text>
            <Text style={styles.quickActionText}>내 모임</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 카테고리별 모임 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🍽️ 카테고리별 모임</Text>
          <TouchableOpacity onPress={() => navigation?.navigateToSearch()}>
            <Text style={styles.moreButton}>더보기 ›</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.categoryGrid}>
          {['한식', '중식', '일식', '양식', '카페', '술집'].map(category => (
            <TouchableOpacity 
              key={category}
              style={styles.categoryCard}
              onPress={() => navigation?.navigateToSearch()}
            >
              <Text style={styles.categoryEmoji}>
                {category === '한식' ? '🍚' : 
                 category === '중식' ? '🥟' : 
                 category === '일식' ? '🍣' : 
                 category === '양식' ? '🍝' : 
                 category === '카페' ? '☕' : '🍻'}
              </Text>
              <Text style={styles.categoryName}>{category}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 인기 모임 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🔥 인기 모임</Text>
          <TouchableOpacity onPress={() => navigation?.navigateToSearch()}>
            <Text style={styles.moreButton}>더보기 ›</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.popularMeetupsContainer}>
          {meetups.map(meetup => (
            <TouchableOpacity 
              key={meetup.id} 
              style={styles.popularMeetupCard}
              onPress={() => navigation?.navigate('MeetupDetail', { meetupId: meetup.id })}
            >
              <Image source={{uri: meetup.image}} style={styles.popularMeetupImage} />
              <View style={styles.popularMeetupOverlay}>
                <View style={styles.popularMeetupBadge}>
                  <Text style={styles.popularMeetupBadgeText}>인기</Text>
                </View>
              </View>
              <View style={styles.popularMeetupInfo}>
                <Text style={styles.popularMeetupTitle} numberOfLines={2}>{meetup.title}</Text>
                <View style={styles.popularMeetupDetails}>
                  <Text style={styles.popularMeetupLocation}>📍 {meetup.location}</Text>
                  <Text style={styles.popularMeetupTime}>🕐 {meetup.date}</Text>
                </View>
                <View style={styles.popularMeetupFooter}>
                  <Text style={styles.popularMeetupParticipants}>
                    👥 {meetup.currentParticipants}/{meetup.maxParticipants}
                  </Text>
                  <Text style={styles.popularMeetupStatus}>모집중</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🍽️ 오늘의 추천</Text>
          <TouchableOpacity onPress={() => navigation?.navigateToSearch()}>
            <Text style={styles.moreButton}>더보기 ›</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.recommendationsContainer}>
          <TouchableOpacity 
            style={styles.recommendationCard}
            onPress={() => navigation?.navigateToSearch()}
          >
            <View style={styles.recommendationIcon}>
              <Text style={styles.recommendationEmoji}>🌟</Text>
            </View>
            <View style={styles.recommendationContent}>
              <Text style={styles.recommendationTitle}>
                믿을 수 있는 식사 친구들
              </Text>
              <Text style={styles.recommendationSubtitle}>
                검증된 회원들과 안전한 모임
              </Text>
            </View>
            <Text style={styles.recommendationArrow}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.recommendationCard}
            onPress={() => navigation?.navigateToSearch()}
          >
            <View style={styles.recommendationIcon}>
              <Text style={styles.recommendationEmoji}>🎯</Text>
            </View>
            <View style={styles.recommendationContent}>
              <Text style={styles.recommendationTitle}>
                맞춤형 모임 추천
              </Text>
              <Text style={styles.recommendationSubtitle}>
                당신의 취향에 딱 맞는 모임
              </Text>
            </View>
            <Text style={styles.recommendationArrow}>›</Text>
          </TouchableOpacity>
        </View>
      </View>


    </ScrollView>

    {/* Floating Action Button */}
    <TouchableOpacity 
      style={styles.fab}
      onPress={() => setShowCreateMeetup(true)}
    >
      <Text style={styles.fabIcon}>+</Text>
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
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.neutral.white,
    marginBottom: 10,
    ...SHADOWS.small,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.large,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 28,
    color: COLORS.text.white,
    fontWeight: 'bold',
  },
  headerText: {
    flex: 1,
    marginRight: 16,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
    backgroundColor: COLORS.secondary.light,
    borderRadius: 20,
    ...SHADOWS.small,
  },
  notificationIcon: {
    fontSize: 24,
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: COLORS.functional.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationCount: {
    color: COLORS.text.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: COLORS.neutral.white,
    marginBottom: 10,
    padding: 20,
    ...SHADOWS.small,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: COLORS.text.primary,
  },
  meetupCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.secondary.light,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    ...SHADOWS.small,
  },
  meetupImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
  },
  meetupInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  meetupTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 5,
  },
  meetupLocation: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 2,
  },
  meetupTime: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 2,
  },
  meetupParticipants: {
    fontSize: 14,
    color: COLORS.primary.dark,
    fontWeight: '500',
  },
  popularMeetupsContainer: {
    gap: 16,
  },
  popularMeetupCard: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 16,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  popularMeetupImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  popularMeetupOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  popularMeetupBadge: {
    backgroundColor: COLORS.functional.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularMeetupBadgeText: {
    color: COLORS.text.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  popularMeetupInfo: {
    padding: 16,
  },
  popularMeetupTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 8,
    lineHeight: 22,
  },
  popularMeetupDetails: {
    marginBottom: 12,
  },
  popularMeetupLocation: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  popularMeetupTime: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  popularMeetupFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  popularMeetupParticipants: {
    fontSize: 14,
    color: COLORS.primary.dark,
    fontWeight: '500',
  },
  popularMeetupStatus: {
    backgroundColor: COLORS.primary.light,
    color: COLORS.primary.dark,
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  recommendationsContainer: {
    gap: 12,
  },
  recommendationCard: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    ...SHADOWS.small,
  },
  recommendationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.secondary.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  recommendationEmoji: {
    fontSize: 24,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  recommendationSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  recommendationArrow: {
    fontSize: 20,
    color: COLORS.text.secondary,
    marginLeft: 8,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary.light,
    ...SHADOWS.small,
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  moreButton: {
    fontSize: 14,
    color: COLORS.primary.main,
    fontWeight: '500',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  categoryCard: {
    width: '30%',
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    ...SHADOWS.small,
  },
  categoryEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.primary,
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
});

export default HomeScreen;