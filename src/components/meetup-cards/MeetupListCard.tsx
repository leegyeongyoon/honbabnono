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
import { COLORS, CSS_SHADOWS } from '../../styles/colors';
import { BORDER_RADIUS, SPACING, LIST_ITEM_STYLE } from '../../styles/spacing';
import { TYPOGRAPHY } from '../../styles/typography';
import { processImageUrl } from '../../utils/imageUtils';
import { formatMeetupDateTime } from '../../utils/dateUtils';
import { getAvatarColor, getInitials } from '../../utils/avatarColor';
import { Icon } from '../Icon';
import StatusBadge from './StatusBadge';
import MeetupTags from './MeetupTags';
import ParticipantIndicator from './ParticipantIndicator';
import type { MeetupCardBaseProps } from './types';
import { getUrgencyInfo, formatDistance } from './types';

const MeetupListCard: React.FC<MeetupCardBaseProps> = ({ meetup, onPress }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const currentP = meetup.currentParticipants ?? 0;
  const maxP = meetup.maxParticipants ?? 4;
  const participantText = `${currentP}/${maxP}명`;
  const locationText =
    formatDistance(meetup.distance) || meetup.address || meetup.location || '위치 미정';
  const urgencyInfo =
    meetup.status === 'recruiting'
      ? getUrgencyInfo(meetup.date, meetup.time, currentP, maxP)
      : null;
  const showLeftAccent = meetup.status === 'recruiting' || !!urgencyInfo;

  const handlePressIn = () => {
    if (Platform.OS !== 'web') {
      Animated.spring(scaleAnim, {
        toValue: 0.97,
        tension: 200,
        friction: 10,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (Platform.OS !== 'web') {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 200,
        friction: 10,
        useNativeDriver: true,
      }).start();
    }
  };

  const cardContent = (
    <>
      {/* 썸네일 이미지 */}
      <View style={styles.imageContainer}>
        {/* Shimmer skeleton */}
        {!imageLoaded &&
          (Platform.OS === 'web' ? (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: COLORS.neutral.grey100,
                borderRadius: BORDER_RADIUS.md,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: `linear-gradient(90deg, ${COLORS.neutral.grey100} 25%, ${COLORS.neutral.grey200} 50%, ${COLORS.neutral.grey100} 75%)`,
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s infinite',
                }}
              />
            </div>
          ) : (
            <View style={styles.imageSkeleton} />
          ))}

        {Platform.OS === 'web' ? (
          <img
            src={processImageUrl(meetup.image, meetup.category)}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: imageLoaded ? 1 : 0,
              transition: 'opacity 300ms ease',
            }}
            alt={meetup.title}
          />
        ) : (
          <Image
            source={{ uri: processImageUrl(meetup.image, meetup.category) }}
            style={[styles.image, { opacity: imageLoaded ? 1 : 0 }]}
            onLoad={() => setImageLoaded(true)}
          />
        )}
      </View>

      {/* 컨텐츠 영역 */}
      <View style={styles.content}>
        {/* 제목 */}
        <Text style={styles.title} numberOfLines={2}>
          {meetup.title}
        </Text>

        {/* 호스트 아바타(22px) + 이름 + 평점 */}
        {meetup.hostName && (
          <View style={styles.hostRow}>
            {meetup.hostImage ? (
              Platform.OS === 'web' ? (
                <img
                  src={meetup.hostImage}
                  style={{ width: 22, height: 22, borderRadius: 11, objectFit: 'cover' }}
                  alt={meetup.hostName}
                />
              ) : (
                <Image source={{ uri: meetup.hostImage }} style={styles.hostAvatar} />
              )
            ) : (
              <View
                style={[
                  styles.hostAvatarPlaceholder,
                  { backgroundColor: getAvatarColor(meetup.hostName || '') },
                ]}
              >
                <Text style={styles.hostAvatarInitial}>
                  {getInitials(meetup.hostName || '')}
                </Text>
              </View>
            )}
            <Text style={styles.hostName}>{meetup.hostName}</Text>
            {meetup.hostRating != null && (
              <View style={styles.hostRatingContainer}>
                <Icon name="star" size={12} color={COLORS.functional.warning} solid />
                <Text style={styles.hostRating}>{meetup.hostRating.toFixed(1)}</Text>
              </View>
            )}
          </View>
        )}

        {/* MeetupTags (md, 최대 4개) */}
        <MeetupTags meetup={meetup} size="md" maxTags={4} />

        {/* 메타: 캘린더 아이콘+날짜, 핀 아이콘+위치 */}
        <View style={styles.metaRow}>
          <Icon name="calendar" size={13} color={COLORS.neutral.grey400} />
          <Text style={styles.metaText}> {formatMeetupDateTime(meetup.date, meetup.time)}</Text>
        </View>
        <View style={styles.metaRow}>
          <Icon name="map-pin" size={13} color={COLORS.neutral.grey400} />
          <Text style={styles.metaText} numberOfLines={1}>
            {' '}{locationText}
          </Text>
        </View>

        {/* 하단: ParticipantIndicator("bar") + StatusBadge */}
        <View style={styles.bottomRow}>
          <ParticipantIndicator current={currentP} max={maxP} variant="bar" />
          {meetup.status && <StatusBadge status={meetup.status} size="md" />}
        </View>
      </View>
    </>
  );

  // ─── Web ─────────────────────────────────────────────────
  if (Platform.OS === 'web') {
    return (
      <div
        onClick={() => onPress(meetup)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setIsPressed(false);
        }}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        role="article"
        aria-label={`${meetup.title}, ${meetup.category}, ${participantText}`}
        style={{
          backgroundColor: isPressed
            ? COLORS.neutral.grey100
            : isHovered
              ? COLORS.neutral.grey50
              : COLORS.neutral.white,
          padding: `${LIST_ITEM_STYLE.paddingVertical}px ${LIST_ITEM_STYLE.paddingHorizontal}px`,
          display: 'flex',
          flexDirection: 'row' as const,
          alignItems: 'flex-start',
          gap: 14,
          transition: 'background-color 120ms ease',
          cursor: 'pointer',
          borderBottom: `1px solid ${LIST_ITEM_STYLE.borderBottomColor}`,
          borderLeft: showLeftAccent
            ? `3px solid ${COLORS.primary.main}`
            : '3px solid transparent',
        }}
      >
        {cardContent}
      </div>
    );
  }

  // ─── Native ──────────────────────────────────────────────
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onPress(meetup)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityLabel={`${meetup.title}, ${meetup.category}, ${participantText}`}
    >
      <Animated.View
        style={[styles.card, { transform: [{ scale: scaleAnim }] }]}
      >
        {cardContent}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.neutral.white,
    paddingVertical: LIST_ITEM_STYLE.paddingVertical,
    paddingHorizontal: LIST_ITEM_STYLE.paddingHorizontal,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    borderBottomWidth: LIST_ITEM_STYLE.borderBottomWidth,
    borderBottomColor: LIST_ITEM_STYLE.borderBottomColor,
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: COLORS.neutral.grey100,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageSkeleton: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.neutral.grey100,
    borderRadius: BORDER_RADIUS.md,
  },
  content: {
    flex: 1,
    gap: 5,
  },
  title: {
    ...TYPOGRAPHY.card.title,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  hostAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  hostAvatarPlaceholder: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hostAvatarInitial: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.text.white,
  },
  hostRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hostName: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    letterSpacing: 0,
  },
  hostRating: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginLeft: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    letterSpacing: 0,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
});

export default MeetupListCard;
