import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useNavigate } from 'react-router-dom';
import {COLORS, SHADOWS} from '../styles/colors';
import {Icon} from '../components/Icon';
import CreateMeetupScreen from './CreateMeetupScreen';
import NeighborhoodSelector from '../components/NeighborhoodSelector';
import locationService from '../services/locationService';
import { useUserStore } from '../store/userStore';
import { useMeetupStore } from '../store/meetupStore';
import { getTimeDifference } from '../utils/timeUtils';

interface HomeScreenProps {
  navigateToLogin?: () => void;
  navigation?: any;
  user?: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigateToLogin, user }) => {
  const navigate = useNavigate();
  const { updateNeighborhood } = useUserStore();
  const { meetups, fetchMeetups } = useMeetupStore();
  const [showCreateMeetup, setShowCreateMeetup] = useState(false);
  const [showNeighborhoodSelector, setShowNeighborhoodSelector] = useState(false);
  const [currentNeighborhood, setCurrentNeighborhood] = useState<{ district: string; neighborhood: string } | null>(null);

  const handleMeetupClick = (meetupId: string) => {
    console.log('🎯 Clicking meetup with ID:', meetupId);
    console.log('🎯 Meetup ID type:', typeof meetupId);
    console.log('🎯 Stack trace:', new Error().stack);
    if (meetupId === '1' || meetupId === 1) {
      console.error('🚨 ALERT: ID is 1! This is the bug!');
      alert(`🚨 BUG FOUND! ID is "${meetupId}" (${typeof meetupId})`);
    }
    navigate(`/meetup/${meetupId}`);
  };

  useEffect(() => {
    loadSavedNeighborhood();
    fetchMeetups();
  }, [fetchMeetups]);

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
      setCurrentNeighborhood(saved);
    } else {
      setCurrentNeighborhood({ district: '신도림역[2호선]', neighborhood: '3번출구' });
    }
  };

  const handleNeighborhoodSelect = (district: string, neighborhood: string) => {
    const newNeighborhood = { district, neighborhood };
    setCurrentNeighborhood(newNeighborhood);
    locationService.saveUserNeighborhood(district, neighborhood);
    updateNeighborhood(district, neighborhood);
  };

  const openNeighborhoodSelector = () => {
    setShowNeighborhoodSelector(true);
  };

  return (
    <View style={styles.container}>
      {/* 상단 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.locationButton} onPress={openNeighborhoodSelector}>
          <Text style={styles.locationText}>
            {currentNeighborhood ? `${currentNeighborhood.district} ${currentNeighborhood.neighborhood}` : '신도림역[2호선] 3번출구'}
          </Text>
          <Icon name="chevron-down" size={14} color="#000000" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.notificationButton}>
          <Icon name="bell" size={20} color="#000000" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 검색창 */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Icon name="search" size={16} color="#999999" />
            <Text style={styles.searchPlaceholder}>뜨끈한 국물모임 어때요?</Text>
          </View>
        </View>

        {/* 카테고리 그리드 */}
        <View style={styles.categorySection}>
          <View style={styles.categoryGrid}>
            <TouchableOpacity style={styles.categoryItem}>
              <View style={styles.categoryBox}>
                <Text style={styles.categoryIcon}>🍚</Text>
              </View>
              <Text style={styles.categoryName}>한식</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.categoryItem}>
              <View style={styles.categoryBox}>
                <Text style={styles.categoryIcon}>🥘</Text>
              </View>
              <Text style={styles.categoryName}>양식</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.categoryItem}>
              <View style={styles.categoryBox}>
                <Text style={styles.categoryIcon}>🍜</Text>
              </View>
              <Text style={styles.categoryName}>중식</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.categoryItem}>
              <View style={styles.categoryBox}>
                <Text style={styles.categoryIcon}>🍣</Text>
              </View>
              <Text style={styles.categoryName}>일식</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.categoryItem}>
              <View style={styles.categoryBox}>
                <Text style={styles.categoryIcon}>☕</Text>
              </View>
              <Text style={styles.categoryName}>카페</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.categoryItem}>
              <View style={styles.categoryBox}>
                <Text style={styles.categoryIcon}>🍻</Text>
              </View>
              <Text style={styles.categoryName}>술집</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.categoryItem}>
              <View style={styles.categoryBox}>
                <Text style={styles.categoryIcon}>🥗</Text>
              </View>
              <Text style={styles.categoryName}>슐럭킨</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.categoryItem}>
              <View style={styles.categoryBox}>
                <Text style={styles.categoryIcon}>🏪</Text>
              </View>
              <Text style={styles.categoryName}>다른애류</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 광고 배너 */}
        <View style={styles.adBanner}>
          <Text style={styles.adText}>광고없이</Text>
        </View>


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
              <TouchableOpacity 
                key={meetup.id} 
                style={styles.meetupItem} 
                onPress={() => handleMeetupClick(meetup.id)}
              >
              <View style={styles.foodImageContainer}>
                {meetup.image ? (
                  <img 
                    src={meetup.image} 
                    alt={meetup.title}
                    style={styles.meetupImage}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <View style={[styles.foodImageSample, meetup.image ? { display: 'none' } : {}]}>
                  <Text style={styles.foodEmoji}>
                    {meetup.category === '한식' ? '🍲' : 
                     meetup.category === '양식' ? '🍝' : 
                     meetup.category === '일식' ? '🍣' : '🥘'}
                  </Text>
                </View>
              </View>
              <View style={styles.meetupContent}>
                <Text style={styles.meetupTitle}>{meetup.title}</Text>
                <Text style={styles.meetupDescription}>{meetup.description || '맛있는 식사 함께 해요!'}</Text>
                <View style={styles.meetupMeta}>
                  <Text style={styles.metaText}>{meetup.location}</Text>
                  <Text style={styles.metaText}>{meetup.currentParticipants}/{meetup.maxParticipants}명</Text>
                  <Text style={styles.metaTimeBlue}>{getTimeDifference(meetup.createdAt || meetup.created_at)}</Text>
                </View>
              </View>
            </TouchableOpacity>
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
            <TouchableOpacity 
              key={meetup.id} 
              style={styles.meetupItem} 
              onPress={() => handleMeetupClick(meetup.id)}
            >
              <View style={styles.foodImageContainer}>
                {meetup.image ? (
                  <img 
                    src={meetup.image} 
                    alt={meetup.title}
                    style={styles.meetupImage}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <View style={[styles.foodImageSample, meetup.image ? { display: 'none' } : {}]}>
                  <Text style={styles.foodEmoji}>
                    {meetup.category === '한식' ? '🍱' : 
                     meetup.category === '양식' ? '🍖' : 
                     meetup.category === '일식' ? '🍜' : '🌶️'}
                  </Text>
                </View>
              </View>
              <View style={styles.meetupContent}>
                <Text style={styles.meetupTitle}>{meetup.title}</Text>
                <Text style={styles.meetupDescription}>{meetup.description || '함께 식사하실 분들 모집해요!'}</Text>
                <View style={styles.meetupMeta}>
                  <Text style={styles.metaText}>{meetup.location}</Text>
                  <Text style={styles.metaText}>{meetup.currentParticipants}/{meetup.maxParticipants}명</Text>
                  <Text style={styles.metaTimeBlue}>{getTimeDifference(meetup.createdAt || meetup.created_at)}</Text>
                </View>
              </View>
            </TouchableOpacity>
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
        <Icon name="plus" size={28} color="#FFFFFF" />
      </TouchableOpacity>


      {/* 모달들 */}
      <Modal
        visible={showCreateMeetup}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <CreateMeetupScreen onClose={() => setShowCreateMeetup(false)} />
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
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 52,
    backgroundColor: '#FFFFFF',
    ...SHADOWS.small,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
  },
  notificationButton: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  searchPlaceholder: {
    fontSize: 14,
    color: '#999999',
    flex: 1,
  },
  categorySection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  categoryItem: {
    width: '22%',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  categoryIcon: {
    fontSize: 32,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
    textAlign: 'center',
  },
  adBanner: {
    backgroundColor: '#F8F9FA',
    paddingVertical: 24,
    alignItems: 'center',
    marginVertical: 12,
    borderRadius: 12,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  adText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    paddingVertical: 20,
    borderRadius: 16,
    marginHorizontal: 20,
    ...SHADOWS.small,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#212529',
    paddingHorizontal: 20,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  meetupItem: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4',
    alignItems: 'flex-start',
  },
  foodImageContainer: {
    marginRight: 12,
  },
  foodImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DEE2E6',
  },
  foodImageSample: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#FFF8E1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE0B2',
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
    color: '#212529',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  meetupDescription: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 10,
    lineHeight: 20,
  },
  meetupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaText: {
    fontSize: 13,
    color: '#868E96',
    fontWeight: '600',
  },
  metaTimeBlue: {
    fontSize: 13,
    color: '#4263EB',
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#495057',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.large,
    shadowColor: 'rgba(73, 80, 87, 0.3)',
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
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  moreText: {
    fontSize: 15,
    color: '#495057',
    fontWeight: '600',
    marginRight: 6,
  },
  moreArrow: {
    fontSize: 15,
    color: '#495057',
    fontWeight: 'bold',
  },
});

export default HomeScreen;