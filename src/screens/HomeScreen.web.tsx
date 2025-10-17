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

  const categories = [
    { id: 'korean', name: '한식', icon: '🍚', desc: '김치찌개/불고기' },
    { id: 'chinese', name: '중식', icon: '🥟', desc: '짜장면/탕수육' },
    { id: 'japanese', name: '일식', icon: '🍣', desc: '초밥/라멘' },
    { id: 'western', name: '양식', icon: '🍝', desc: '파스타/스테이크' },
    { id: 'cafe', name: '카페', icon: '☕', desc: '디저트/음료' },
    { id: 'bar', name: '술집', icon: '🍻', desc: '맥주/안주' },
    { id: 'fastfood', name: '패스트푸드', icon: '🍔', desc: '햄버거/치킨' },
    { id: 'dessert', name: '디저트', icon: '🍰', desc: '케이크/아이스크림' },
  ];

  return (
    <View style={styles.container}>
      {/* 고정 위치 헤더 */}
      <View style={styles.fixedLocationHeader}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.locationButton} onPress={handleLocationChange}>
            <View style={styles.locationIconContainer}>
              <Text style={styles.locationIcon}>📍</Text>
            </View>
            <View style={styles.locationTextContainer}>
              <Text style={styles.locationLabel}>현재 위치</Text>
              <Text style={styles.locationText}>{currentLocation}</Text>
            </View>
            <Text style={styles.locationArrow}>▼</Text>
          </TouchableOpacity>
          
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconButton} onPress={() => navigation?.navigateToSearch()}>
              <View style={styles.iconContainer}>
                <Text style={styles.searchIcon}>🔍</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={() => console.log('알림')}>
              <View style={styles.iconContainer}>
                <Text style={styles.notificationIcon}>🔔</Text>
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
                  <Text style={styles.categoryIcon}>{category.icon}</Text>
                </View>
                <Text style={styles.categoryName}>{category.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 활동이 활발한 모임 섹션 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>활동이 활발한 모임</Text>
            <TouchableOpacity onPress={() => navigation?.navigateToSearch()}>
              <Text style={styles.moreButton}>더보기 ›</Text>
            </TouchableOpacity>
          </View>
          
          {meetups.map((meetup) => (
            <TouchableOpacity 
              key={meetup.id} 
              style={styles.meetupCard}
              onPress={() => navigation?.navigate('MeetupDetail', { meetupId: meetup.id })}
            >
              <View style={styles.meetupHeader}>
                <View style={styles.meetupTitleSection}>
                  <Text style={styles.meetupTitle}>{meetup.title}</Text>
                  <View style={styles.meetupMeta}>
                    <Text style={styles.meetupLocation}>📍 {meetup.location}</Text>
                    <Text style={styles.meetupTime}>🕐 {meetup.date} {meetup.time}</Text>
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
                  <Text style={styles.hostRating}>⭐ 4.8</Text>
                </View>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{meetup.category}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
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
  },
  fixedLocationHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: '#ede0c8',
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ebe7dc',
    ...SHADOWS.small,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8eaed',
  },
  locationIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
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
    fontSize: 11,
    color: '#5f6368',
    fontWeight: '400',
    lineHeight: 14,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#202124',
    lineHeight: 18,
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
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e8eaed',
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
    paddingTop: 78, // 고정 헤더 높이만큼 패딩 추가
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
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  categoryIcon: {
    fontSize: 24,
  },
  categoryName: {
    fontSize: 12,
    color: COLORS.text.primary,
    textAlign: 'center',
    fontWeight: '500',
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
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  moreButton: {
    fontSize: 14,
    color: COLORS.primary.main,
    fontWeight: '500',
  },
  meetupCard: {
    backgroundColor: COLORS.neutral.white,
    marginHorizontal: 0,
    marginBottom: 0,
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
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 6,
    lineHeight: 22,
  },
  meetupMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  meetupLocation: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  meetupTime: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  meetupStatus: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 12,
    color: COLORS.primary.main,
    fontWeight: 'bold',
    marginBottom: 4,
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
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.large,
    elevation: 8,
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
});

export default HomeScreen;