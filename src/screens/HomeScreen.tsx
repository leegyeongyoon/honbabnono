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
import {useTypedNavigation} from '../hooks/useNavigation';
import {COLORS, SHADOWS} from '../styles/colors';
import CreateMeetupScreen from './CreateMeetupScreen';
import { useMeetups } from '../hooks/useMeetups';
import { formatKoreanDateTime } from '../utils/dateUtils';

const HomeScreen = () => {
  const navigation = useTypedNavigation();
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔥 인기 모임</Text>
        {meetups.map(meetup => (
          <TouchableOpacity 
            key={meetup.id} 
            style={styles.meetupCard}
            onPress={() => navigation.navigate('MeetupDetail', { meetupId: meetup.id })}
          >
            <Image source={{uri: meetup.image}} style={styles.meetupImage} />
            <View style={styles.meetupInfo}>
              <Text style={styles.meetupTitle}>{meetup.title}</Text>
              <Text style={styles.meetupLocation}>📍 {meetup.location}</Text>
              <Text style={styles.meetupTime}>🕐 {formatKoreanDateTime(meetup.date, 'datetime')}</Text>
              <Text style={styles.meetupParticipants}>
                👥 {meetup.currentParticipants}/{meetup.maxParticipants}명
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🍽️ 오늘의 추천</Text>
        <TouchableOpacity 
          style={styles.recommendationCard}
          onPress={() => navigation.navigateToSearch()}
        >
          <Text style={styles.recommendationTitle}>
            믿을 수 있는 식사 친구들
          </Text>
          <Text style={styles.recommendationSubtitle}>
            검증된 회원들과 안전한 모임을 가져보세요
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>✨ 새로운 모임</Text>
        <TouchableOpacity 
          style={styles.createMeetupCard}
          onPress={() => setShowCreateMeetup(true)}
        >
          <Text style={styles.createMeetupIcon}>🎉</Text>
          <Text style={styles.createMeetupTitle}>
            나만의 모임 만들기
          </Text>
          <Text style={styles.createMeetupSubtitle}>
            새로운 사람들과 특별한 식사 경험을 만들어보세요
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔐 계정</Text>
        <TouchableOpacity 
          style={styles.loginCard}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginTitle}>로그인 / 회원가입</Text>
          <Text style={styles.loginSubtitle}>
            로그인하고 더 많은 기능을 이용해보세요!
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>

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
  recommendationCard: {
    backgroundColor: COLORS.primary.main,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  recommendationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.white,
    marginBottom: 5,
  },
  recommendationSubtitle: {
    fontSize: 14,
    color: COLORS.text.white,
    opacity: 0.9,
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