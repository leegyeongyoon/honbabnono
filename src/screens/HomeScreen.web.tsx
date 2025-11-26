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
import { FOOD_CATEGORIES } from '../constants/categories';

interface HomeScreenProps {
  navigateToLogin?: () => void;
  navigation?: any;
  user?: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigateToLogin, user }) => {
  const navigate = useNavigate();
  const { updateNeighborhood } = useUserStore();
  const { meetups, fetchHomeMeetups } = useMeetupStore();
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
    const newNeighborhood = { district, neighborhood };
    setCurrentNeighborhood(newNeighborhood);
    locationService.saveUserNeighborhood(district, neighborhood);
    updateNeighborhood(district, neighborhood);
  };

  const getCategoryIcon = (categoryName: string) => {
    const category = FOOD_CATEGORIES.find(cat => cat.name === categoryName);
    return category ? category.icon : 'utensils';
  };

  const getCategoryColor = (categoryName: string) => {
    const category = FOOD_CATEGORIES.find(cat => cat.name === categoryName);
    return category ? category.color : COLORS.primary.main;
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
          <Icon name="chevron-down" size={14} color={COLORS.text.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.notificationButton}>
          <Icon name="bell" size={20} color={COLORS.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 검색창 */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Icon name="search" size={16} color={COLORS.text.secondary} />
            <Text style={styles.searchPlaceholder}>뜨끈한 국물모임 어때요?</Text>
          </View>
        </View>

        {/* 카테고리 그리드 */}
        <View style={styles.categorySection}>
          <View style={styles.categoryGrid}>
            {FOOD_CATEGORIES.map((category, index) => (
              <TouchableOpacity key={category.id} style={styles.categoryItem}>
                <View style={[styles.categoryBox, { backgroundColor: category.bgColor }]}>
                  <Icon name={category.icon as any} size={24} color={category.color} />
                </View>
                <Text style={styles.categoryName}>{category.name}</Text>
              </TouchableOpacity>
            ))}
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
                  <Icon 
                    name={getCategoryIcon(meetup.category) as any} 
                    size={32} 
                    color={getCategoryColor(meetup.category)} 
                  />
                </View>
              </View>
              <View style={styles.meetupContent}>
                <Text style={styles.meetupTitle}>{meetup.title}</Text>
                <Text style={styles.meetupDescription}>{meetup.description || '맛있는 식사 함께 해요!'}</Text>
                
                {/* 카테고리 + 가격대 */}
                <View style={styles.meetupTags}>
                  <View style={[styles.categoryTag, { backgroundColor: getCategoryColor(meetup.category) + '20' }]}>
                    <Icon 
                      name={getCategoryIcon(meetup.category) as any} 
                      size={12} 
                      color={getCategoryColor(meetup.category)} 
                    />
                    <Text style={[styles.categoryTagText, { color: getCategoryColor(meetup.category) }]}>
                      {meetup.category}
                    </Text>
                  </View>
                  {meetup.priceRange && (
                    <View style={styles.priceTag}>
                      <Icon name="utensils" size={12} color={COLORS.functional.success} />
                      <Text style={styles.priceTagText}>{meetup.priceRange}</Text>
                    </View>
                  )}
                </View>

                {/* 시간 + 장소 정보 */}
                <View style={styles.meetupDetails}>
                  <View style={styles.detailRow}>
                    <Icon name="clock" size={14} color={COLORS.primary.main} />
                    <Text style={styles.detailText}>
                      {meetup.date} {meetup.time}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Icon name="map-pin" size={14} color={COLORS.text.secondary} />
                    <Text style={styles.detailText} numberOfLines={1}>
                      {meetup.address || meetup.location}
                    </Text>
                  </View>
                </View>

                {/* 참가자 + 생성시간 */}
                <View style={styles.meetupMeta}>
                  <View style={styles.participantInfo}>
                    <Icon name="users" size={12} color={COLORS.text.secondary} />
                    <Text style={styles.metaText}>{meetup.currentParticipants}/{meetup.maxParticipants}명</Text>
                  </View>
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
                  <Icon 
                    name={getCategoryIcon(meetup.category) as any} 
                    size={32} 
                    color={getCategoryColor(meetup.category)} 
                  />
                </View>
              </View>
              <View style={styles.meetupContent}>
                <Text style={styles.meetupTitle}>{meetup.title}</Text>
                <Text style={styles.meetupDescription}>{meetup.description || '함께 식사하실 분들 모집해요!'}</Text>
                
                {/* 카테고리 + 가격대 */}
                <View style={styles.meetupTags}>
                  <View style={[styles.categoryTag, { backgroundColor: getCategoryColor(meetup.category) + '20' }]}>
                    <Icon 
                      name={getCategoryIcon(meetup.category) as any} 
                      size={12} 
                      color={getCategoryColor(meetup.category)} 
                    />
                    <Text style={[styles.categoryTagText, { color: getCategoryColor(meetup.category) }]}>
                      {meetup.category}
                    </Text>
                  </View>
                  {meetup.priceRange && (
                    <View style={styles.priceTag}>
                      <Icon name="utensils" size={12} color={COLORS.functional.success} />
                      <Text style={styles.priceTagText}>{meetup.priceRange}</Text>
                    </View>
                  )}
                </View>

                {/* 시간 + 장소 정보 */}
                <View style={styles.meetupDetails}>
                  <View style={styles.detailRow}>
                    <Icon name="clock" size={14} color={COLORS.primary.main} />
                    <Text style={styles.detailText}>
                      {meetup.date} {meetup.time}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Icon name="map-pin" size={14} color={COLORS.text.secondary} />
                    <Text style={styles.detailText} numberOfLines={1}>
                      {meetup.address || meetup.location}
                    </Text>
                  </View>
                </View>

                {/* 참가자 + 생성시간 */}
                <View style={styles.meetupMeta}>
                  <View style={styles.participantInfo}>
                    <Icon name="users" size={12} color={COLORS.text.secondary} />
                    <Text style={styles.metaText}>{meetup.currentParticipants}/{meetup.maxParticipants}명</Text>
                  </View>
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
        <Icon name="plus" size={28} color={COLORS.neutral.white} />
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.background,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
  },
  searchPlaceholder: {
    fontSize: 14,
    color: COLORS.text.secondary,
    flex: 1,
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
    backgroundColor: COLORS.neutral.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
  },
  categoryIcon: {
    fontSize: 32,
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
});

export default HomeScreen;