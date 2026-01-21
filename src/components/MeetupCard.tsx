import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { COLORS, SHADOWS } from '../styles/colors';
import { Icon } from './Icon';
import { getTimeDifference } from '../utils/timeUtils';
import { processImageUrl } from '../utils/imageUtils';
import { formatMeetupDateTime } from '../utils/dateUtils';
import { FOOD_CATEGORIES } from '../constants/categories';

interface Meetup {
  id: string;
  title: string;
  description?: string;
  category: string;
  location: string;
  address?: string;
  date: string;
  time: string;
  maxParticipants: number;
  currentParticipants: number;
  priceRange?: string;
  ageRange?: string;
  genderPreference?: string;
  image?: string;
  createdAt?: string;
  created_at?: string;
  distance?: number | null; // 사용자 위치로부터의 거리 (미터)
}

// 거리 포맷팅 함수
const formatDistance = (distanceInMeters: number | null | undefined): string | null => {
  if (distanceInMeters === null || distanceInMeters === undefined) {
    return null;
  }

  if (distanceInMeters < 1000) {
    return `${Math.round(distanceInMeters)}m`;
  } else {
    return `${(distanceInMeters / 1000).toFixed(1)}km`;
  }
};

interface MeetupCardProps {
  meetup: Meetup;
  onPress: (meetup: Meetup) => void;
}

const MeetupCard: React.FC<MeetupCardProps> = ({ meetup, onPress }) => {
  const getCategoryEmoji = (categoryName: string) => {
    const category = FOOD_CATEGORIES.find(cat => cat.name === categoryName);
    return category ? category.emoji : '🍴';
  };

  const getCategoryColor = (categoryName: string) => {
    const category = FOOD_CATEGORIES.find(cat => cat.name === categoryName);
    return category ? category.color : COLORS.primary.main;
  };

  return (
    <TouchableOpacity 
      style={styles.meetupItem} 
      onPress={() => onPress(meetup)}
    >
      <View style={styles.foodImageContainer}>
        <Image 
          source={{ uri: processImageUrl(meetup.image, meetup.category) }}
          style={styles.meetupImage}
          onError={() => {
            // React Native에서는 기본 이미지 fallback이 자동으로 처리됨
          }}
        />
      </View>
      
      <View style={styles.meetupContent}>
        <Text style={styles.meetupTitle}>{meetup.title}</Text>
        <Text style={styles.meetupDescription}>
          {meetup.description || '맛있는 식사 함께 해요!'}
        </Text>
        
        {/* 필수 필터 뱃지들 */}
        <View style={styles.meetupTags}>
          {/* 카테고리 뱃지 */}
          <View style={[styles.categoryTag, { backgroundColor: getCategoryColor(meetup.category) + '20' }]}>
            <Text style={styles.categoryEmoji}>{getCategoryEmoji(meetup.category)}</Text>
            <Text style={[styles.categoryTagText, { color: getCategoryColor(meetup.category) }]}>
              {meetup.category}
            </Text>
          </View>
          
          {/* 가격대 뱃지 */}
          {meetup.priceRange && (
            <View style={styles.priceTag}>
              <Icon name="utensils" size={12} color={COLORS.functional.success} />
              <Text style={styles.priceTagText}>{meetup.priceRange}</Text>
            </View>
          )}
          
          {/* 연령대 뱃지 */}
          {meetup.ageRange && (
            <View style={styles.ageTag}>
              <Icon name="users" size={12} color={COLORS.text.secondary} />
              <Text style={styles.ageTagText}>{meetup.ageRange}</Text>
            </View>
          )}
          
          {/* 성별 뱃지 */}
          {meetup.genderPreference && (
            <View style={styles.genderTag}>
              <Icon 
                name={meetup.genderPreference === '남성만' ? 'user' : meetup.genderPreference === '여성만' ? 'user' : 'users'} 
                size={12} 
                color={COLORS.primary.main} 
              />
              <Text style={styles.genderTagText}>{meetup.genderPreference}</Text>
            </View>
          )}
        </View>

        {/* 시간 + 장소 정보 */}
        <View style={styles.meetupDetails}>
          <View style={styles.detailRow}>
            <Icon name="clock" size={14} color={COLORS.primary.main} />
            <Text style={styles.detailText}>
              {formatMeetupDateTime(meetup.date, meetup.time)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="map-pin" size={14} color={COLORS.text.secondary} />
            <Text style={styles.detailText} numberOfLines={1}>
              {formatDistance(meetup.distance)
                ? `${formatDistance(meetup.distance)}`
                : (meetup.address || meetup.location)}
            </Text>
          </View>
        </View>

        {/* 참가자 + 생성시간 */}
        <View style={styles.meetupMeta}>
          <View style={styles.participantInfo}>
            <Icon name="users" size={12} color={COLORS.text.secondary} />
            <Text style={styles.metaText}>{meetup.currentParticipants}/{meetup.maxParticipants}명</Text>
          </View>
          <Text style={styles.metaTimeBlue}>
            {getTimeDifference(meetup.createdAt || meetup.created_at)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  meetupItem: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    ...SHADOWS.small,
  },
  foodImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  meetupImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  foodImageSample: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.neutral.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
  },
  meetupContent: {
    flex: 1,
    gap: 6,
  },
  meetupTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  meetupDescription: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginBottom: 8,
    lineHeight: 18,
  },
  meetupTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  categoryEmoji: {
    fontSize: 12,
  },
  categoryTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  priceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: COLORS.functional.success + '20',
    gap: 3,
  },
  priceTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.functional.success,
  },
  ageTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: COLORS.text.secondary + '20',
    gap: 3,
  },
  ageTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  genderTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: COLORS.primary.main + '20',
    gap: 3,
  },
  genderTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary.main,
  },
  meetupDetails: {
    marginBottom: 6,
    gap: 3,
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
    fontSize: 12,
    color: COLORS.primary.main,
    fontWeight: '600',
  },
});

export default MeetupCard;