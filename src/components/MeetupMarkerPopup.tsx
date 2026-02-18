import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import { COLORS, SHADOWS } from '../styles/colors';
import { Icon } from './Icon';

interface MeetupData {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  address?: string;
  category: string;
  currentParticipants: number;
  maxParticipants: number;
  image?: string;
  hostName?: string;
  distance?: number;
}

interface MeetupMarkerPopupProps {
  meetup: MeetupData | null;
  onDetailPress: (meetupId: string) => void;
  onClose: () => void;
}

const MeetupMarkerPopup: React.FC<MeetupMarkerPopupProps> = ({
  meetup,
  onDetailPress,
  onClose,
}) => {
  if (!meetup) {return null;}

  // Format date
  const formatDate = (dateStr: string, timeStr: string) => {
    try {
      const date = new Date(dateStr);
      const month = date.getMonth() + 1;
      const day = date.getDate();

      // Parse time
      const timeParts = timeStr.split(':');
      const hours = parseInt(timeParts[0], 10);
      const minutes = timeParts[1] || '00';
      const period = hours < 12 ? '오전' : '오후';
      const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

      return `${month}월 ${day}일 ${period} ${hour12}:${minutes}`;
    } catch {
      return dateStr;
    }
  };

  // Format distance
  const formatDistance = (distance?: number) => {
    if (!distance) {return '';}
    if (distance < 1000) {
      return `${distance}m`;
    }
    return `${(distance / 1000).toFixed(1)}km`;
  };

  // Category icon
  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      '한식': 'utensils',
      '중식': 'utensils',
      '일식': 'utensils',
      '양식': 'utensils',
      '카페': 'coffee',
      '술집': 'glass-wine',
      '기타': 'utensils',
    };
    return icons[category] || 'utensils';
  };

  return (
    <Animated.View style={styles.container}>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={onClose}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Icon name="x" size={16} color={COLORS.text.tertiary} />
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Title */}
        <Text style={styles.title} numberOfLines={1}>
          {meetup.title}
        </Text>

        {/* Date and Time */}
        <View style={styles.infoRow}>
          <Icon name="calendar" size={14} color={COLORS.text.tertiary} />
          <Text style={styles.infoText}>
            {formatDate(meetup.date, meetup.time)}
          </Text>
        </View>

        {/* Location */}
        <View style={styles.infoRow}>
          <Icon name="map-pin" size={14} color={COLORS.functional.error} />
          <Text style={styles.infoText} numberOfLines={1}>
            {meetup.location}
          </Text>
          {meetup.distance && (
            <Text style={styles.distanceText}>
              {formatDistance(meetup.distance)}
            </Text>
          )}
        </View>

        {/* Participants */}
        <View style={styles.infoRow}>
          <Icon name="users" size={14} color={COLORS.text.tertiary} />
          <Text style={styles.infoText}>
            {meetup.currentParticipants}/{meetup.maxParticipants}명 참가중
          </Text>
        </View>

        {/* Detail Button */}
        <TouchableOpacity
          style={styles.detailButton}
          onPress={() => onDetailPress(meetup.id)}
        >
          <Text style={styles.detailButtonText}>모임 상세보기</Text>
          <Icon name="arrow-right" size={16} color={COLORS.text.secondary} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    ...SHADOWS.large,
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 4,
  },
  content: {
    padding: 16,
    paddingRight: 40,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    flex: 1,
  },
  distanceText: {
    fontSize: 12,
    color: COLORS.primary.main,
    fontWeight: '600',
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.neutral.light,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
    gap: 4,
  },
  detailButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
});

export default MeetupMarkerPopup;
