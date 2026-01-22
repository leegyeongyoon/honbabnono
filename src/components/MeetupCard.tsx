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
  distance?: number | null;
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

  // 참가 현황 표시 (예: "1/4명")
  const participantText = `${meetup.currentParticipants}/${meetup.maxParticipants}명`;

  // 참가율에 따른 색상
  const getParticipantColor = () => {
    const ratio = meetup.currentParticipants / meetup.maxParticipants;
    if (ratio >= 1) {return COLORS.functional.error;} // 마감
    if (ratio >= 0.75) {return '#FF9800';} // 거의 마감
    return COLORS.functional.success; // 여유
  };

  // 위치 텍스트 (거리 또는 주소)
  const locationText = formatDistance(meetup.distance) || meetup.address || meetup.location;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(meetup)}
      activeOpacity={0.7}
    >
      {/* 썸네일 이미지 */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: processImageUrl(meetup.image, meetup.category) }}
          style={styles.image}
        />
        {/* 카테고리 뱃지 (이미지 위) */}
        <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(meetup.category) }]}>
          <Text style={styles.categoryEmoji}>{getCategoryEmoji(meetup.category)}</Text>
        </View>
      </View>

      {/* 컨텐츠 영역 */}
      <View style={styles.content}>
        {/* 상단: 제목 */}
        <Text style={styles.title} numberOfLines={1}>
          {meetup.title}
        </Text>

        {/* 중단: 날짜/시간 */}
        <View style={styles.infoRow}>
          <Icon name="calendar" size={14} color={COLORS.primary.main} />
          <Text style={styles.infoText}>
            {formatMeetupDateTime(meetup.date, meetup.time)}
          </Text>
        </View>

        {/* 중단: 위치 */}
        <View style={styles.infoRow}>
          <Icon name="map-pin" size={14} color={COLORS.text.tertiary} />
          <Text style={styles.locationText} numberOfLines={1}>
            {locationText}
          </Text>
        </View>

        {/* 하단: 참가자 + 태그 + 시간 */}
        <View style={styles.bottomRow}>
          {/* 참가 현황 */}
          <View style={styles.participantBadge}>
            <Icon name="users" size={12} color={getParticipantColor()} />
            <Text style={[styles.participantText, { color: getParticipantColor() }]}>
              {participantText}
            </Text>
          </View>

          {/* 태그들 (가격대만 표시) */}
          {meetup.priceRange && (
            <View style={styles.priceTag}>
              <Text style={styles.priceText}>{meetup.priceRange}</Text>
            </View>
          )}

          {/* 등록 시간 */}
          <Text style={styles.timeAgo}>
            {getTimeDifference(meetup.createdAt || meetup.created_at)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    ...SHADOWS.small,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  categoryBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryEmoji: {
    fontSize: 12,
  },
  content: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  locationText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  participantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.neutral.grey100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  participantText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priceTag: {
    backgroundColor: COLORS.functional.success + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.functional.success,
  },
  timeAgo: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    marginLeft: 'auto',
  },
});

export default MeetupCard;
