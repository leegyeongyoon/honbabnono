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
      {/* 상단 헤더 */}
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

      {/* 검색창 */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.searchCard}
          onPress={() => navigation.navigateToSearch()}
        >
          <Text style={styles.searchTitle}>⌕ 검색</Text>
          <Text style={styles.searchSubtitle}>원하는 모임을 찾아보세요</Text>
        </TouchableOpacity>
      </View>

      {/* 홈대문 */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.homeMainCard}
          onPress={() => console.log('홈대문 이동')}
        >
          <Text style={styles.homeMainTitle}>🏠 홈대문</Text>
          <Text style={styles.homeMainSubtitle}>혼밥시러 커뮤니티 소식을 확인하세요</Text>
        </TouchableOpacity>
      </View>

      {/* 카테고리 선택 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🍽️ 카테고리</Text>
        <View style={styles.categoryContainer}>
          <TouchableOpacity style={styles.categoryButton}>
            <Text style={styles.categoryText}>한번에</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.categoryButton}>
            <Text style={styles.categoryText}>식사동행</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.categoryButton}>
            <Text style={styles.categoryText}>상황</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.categoryButton}>
            <Text style={styles.categoryText}>기타</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 모임방 리스트 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔥 인기 모임방</Text>
        
        <TouchableOpacity style={styles.meetupCard}>
          <View style={styles.meetupInfo}>
            <Text style={styles.meetupTitle}>모임방스 1</Text>
            <Text style={styles.meetupLocation}>📍 강남구</Text>
            <Text style={styles.meetupParticipants}>👥 5/8명</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.meetupCard}>
          <View style={styles.meetupInfo}>
            <Text style={styles.meetupTitle}>모임방스 2</Text>
            <Text style={styles.meetupLocation}>📍 홍대</Text>
            <Text style={styles.meetupParticipants}>👥 3/6명</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.meetupCard}>
          <View style={styles.meetupInfo}>
            <Text style={styles.meetupTitle}>모임방스 3</Text>
            <Text style={styles.meetupLocation}>📍 신촌</Text>
            <Text style={styles.meetupParticipants}>👥 2/4명</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.meetupCard}>
          <View style={styles.meetupInfo}>
            <Text style={styles.meetupTitle}>모임방스 4</Text>
            <Text style={styles.meetupLocation}>📍 종로</Text>
            <Text style={styles.meetupParticipants}>👥 4/6명</Text>
          </View>
        </TouchableOpacity>

        {/* 더보기 버튼 */}
        <TouchableOpacity 
          style={styles.moreButton}
          onPress={() => navigation.navigate('MeetupList')}
        >
          <Text style={styles.moreText}>모든 모임 보기</Text>
          <Text style={styles.moreArrow}>→</Text>
        </TouchableOpacity>
      </View>

      {/* 하단 추천 기능들 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>✨ 추천 모임</Text>
        
        <TouchableOpacity style={styles.recommendationCard}>
          <Text style={styles.recommendationTitle}>우리 지역 맛집을 알고 계신 분</Text>
          <Text style={styles.recommendationSubtitle}>동네 맛집 정보를 공유해요</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.recommendationCard}>
          <Text style={styles.recommendationTitle}>오늘 가실 분이 계시는 분</Text>
          <Text style={styles.recommendationSubtitle}>바로 오늘 만나실 분들</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.recommendationCard}>
          <Text style={styles.recommendationTitle}>오늘 18:30 이시는 분</Text>
          <Text style={styles.recommendationSubtitle">저녁 시간 함께해요</Text>
        </TouchableOpacity>
      </View>

      {/* 새로운 모임 만들기 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎉 새로운 모임</Text>
        <TouchableOpacity 
          style={styles.createMeetupCard}
          onPress={() => setShowCreateMeetup(true)}
        >
          <Text style={styles.createMeetupIcon}>🎉</Text>
          <Text style={styles.createMeetupTitle}>나만의 모임 만들기</Text>
          <Text style={styles.createMeetupSubtitle}>새로운 사람들과 특별한 식사 경험을 만들어보세요</Text>
        </TouchableOpacity>
      </View>

      {/* 로그인 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔐 계정</Text>
        <TouchableOpacity 
          style={styles.loginCard}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginTitle}>로그인 / 회원가입</Text>
          <Text style={styles.loginSubtitle}>로그인하고 더 많은 기능을 이용해보세요!</Text>
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
  meetupCard: {
    backgroundColor: COLORS.secondary.light,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    ...SHADOWS.small,
  },
  meetupInfo: {
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
  meetupParticipants: {
    fontSize: 14,
    color: COLORS.primary.dark,
    fontWeight: '500',
  },
  moreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary.light,
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    ...SHADOWS.small,
  },
  moreText: {
    fontSize: 14,
    color: COLORS.primary.dark,
    fontWeight: '500',
    marginRight: 5,
  },
  moreArrow: {
    fontSize: 14,
    color: COLORS.primary.dark,
    fontWeight: 'bold',
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