import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  Animated,
} from 'react-native';
import { COLORS, SHADOWS, CSS_SHADOWS } from '../styles/colors';
import { TYPOGRAPHY } from '../styles/typography';
import { SPACING, BORDER_RADIUS } from '../styles/spacing';
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
  status?: 'recruiting' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  createdAt?: string;
  created_at?: string;
  distance?: number | null;
  hostName?: string;
  hostImage?: string;
  hostRating?: number;
}

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

const STATUS_CONFIG = {
  recruiting: { label: '모집중', bg: COLORS.functional.success },
  confirmed: { label: '모집완료', bg: COLORS.text.tertiary },
  in_progress: { label: '진행중', bg: COLORS.primary.main },
  completed: { label: '완료', bg: COLORS.text.secondary },
  cancelled: { label: '취소됨', bg: COLORS.functional.error },
} as const;

interface MeetupCardProps {
  meetup: Meetup;
  onPress: (meetup: Meetup) => void;
}

const MeetupCard: React.FC<MeetupCardProps> = ({ meetup, onPress }) => {
  const [isHovered, setIsHovered] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const getCategoryEmoji = (categoryName: string) => {
    const category = FOOD_CATEGORIES.find(cat => cat.name === categoryName);
    return category ? category.emoji : '🍴';
  };

  const participantText = `${meetup.currentParticipants}/${meetup.maxParticipants}명`;

  const locationText = formatDistance(meetup.distance) || meetup.address || meetup.location;

  const statusConfig = meetup.status ? STATUS_CONFIG[meetup.status] : null;

  const handlePressIn = () => {
    if (Platform.OS !== 'web') {
      Animated.spring(scaleAnim, {
        toValue: 0.97,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (Platform.OS !== 'web') {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }).start();
    }
  };

  const cardContent = (
    <>
      {/* 썸네일 이미지 */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: processImageUrl(meetup.image, meetup.category) }}
          style={styles.image}
        />
      </View>

      {/* 컨텐츠 영역 */}
      <View style={styles.content}>
        {/* 제목 */}
        <Text style={styles.title} numberOfLines={1}>
          {meetup.title}
        </Text>

        {/* 호스트 정보 */}
        {meetup.hostName && (
          <View style={styles.hostRow}>
            {meetup.hostImage ? (
              <Image
                source={{ uri: meetup.hostImage }}
                style={styles.hostAvatar}
              />
            ) : (
              <View style={styles.hostAvatarPlaceholder}>
                <Text style={styles.hostAvatarEmoji}>👤</Text>
              </View>
            )}
            <Text style={styles.hostName}>{meetup.hostName}</Text>
            {meetup.hostRating != null && (
              <Text style={styles.hostRating}>⭐ {meetup.hostRating.toFixed(1)}</Text>
            )}
          </View>
        )}

        {/* 태그 뱃지들 */}
        <View style={styles.tagRow}>
          <View style={styles.categoryTag}>
            <Text style={styles.categoryTagText}>
              {getCategoryEmoji(meetup.category)} {meetup.category}
            </Text>
          </View>
          {meetup.priceRange && (
            <View style={styles.priceTag}>
              <Text style={styles.priceTagText}>{meetup.priceRange}</Text>
            </View>
          )}
          {meetup.ageRange && (
            <View style={styles.ageTag}>
              <Text style={styles.ageTagText}>{meetup.ageRange}</Text>
            </View>
          )}
        </View>

        {/* 날짜/시간 */}
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            📅 {formatMeetupDateTime(meetup.date, meetup.time)}
          </Text>
        </View>

        {/* 위치 */}
        <View style={styles.metaRow}>
          <Text style={styles.metaText} numberOfLines={1}>
            📍 {locationText}
          </Text>
        </View>

        {/* 참가자 + 상태 뱃지 */}
        <View style={styles.bottomRow}>
          <Text style={styles.metaText}>
            👥 {participantText}
          </Text>
          {statusConfig && (
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
              <Text style={styles.statusText}>{statusConfig.label}</Text>
            </View>
          )}
        </View>
      </View>
    </>
  );

  if (Platform.OS === 'web') {
    return (
      <div
        onClick={() => onPress(meetup)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label={`${meetup.title}, ${meetup.category}, ${participantText}`}
        style={{
          backgroundColor: COLORS.neutral.white,
          borderRadius: BORDER_RADIUS.lg,
          padding: SPACING.md,
          marginBottom: SPACING.md,
          display: 'flex',
          flexDirection: 'row' as const,
          alignItems: 'flex-start',
          gap: SPACING.md,
          boxShadow: isHovered ? CSS_SHADOWS.medium : CSS_SHADOWS.small,
          transform: isHovered ? 'scale(1.02)' : 'scale(1)',
          transition: 'transform 200ms ease, box-shadow 200ms ease',
          cursor: 'pointer',
        }}
      >
        {cardContent}
      </div>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onPress(meetup)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityLabel={`${meetup.title}, ${meetup.category}, ${participantText}`}
    >
      <Animated.View
        style={[
          styles.card,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {cardContent}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    ...SHADOWS.small,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  title: {
    ...TYPOGRAPHY.card.title,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  hostAvatar: {
    width: SPACING.xxl,
    height: SPACING.xxl,
    borderRadius: BORDER_RADIUS.full,
  },
  hostAvatarPlaceholder: {
    width: SPACING.xxl,
    height: SPACING.xxl,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primary.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hostAvatarEmoji: {
    fontSize: 14,
  },
  hostName: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  hostRating: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  categoryTag: {
    height: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: COLORS.primary.light,
    justifyContent: 'center',
  },
  categoryTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  priceTag: {
    height: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: COLORS.primary.accent,
    justifyContent: 'center',
  },
  priceTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  ageTag: {
    height: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: COLORS.primary.light,
    justifyContent: 'center',
  },
  ageTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.text.tertiary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.text.white,
  },
});

export default MeetupCard;
