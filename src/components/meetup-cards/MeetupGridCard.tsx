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
import { COLORS, CSS_SHADOWS, CARD_STYLE } from '../../styles/colors';
import { BORDER_RADIUS } from '../../styles/spacing';
import { processImageUrl } from '../../utils/imageUtils';
import { formatMeetupDateTime } from '../../utils/dateUtils';
import { Icon } from '../Icon';
import StatusBadge from './StatusBadge';
import MeetupTags from './MeetupTags';
import type { MeetupCardBaseProps } from './types';

interface MeetupGridCardProps extends MeetupCardBaseProps {
  width?: number;
}

const MeetupGridCard: React.FC<MeetupGridCardProps> = ({ meetup, onPress, width = 240 }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const currentP = meetup.currentParticipants ?? 0;
  const maxP = meetup.maxParticipants ?? 4;
  const participantText = `${currentP}/${maxP}명`;

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

  const gridContent = (
    <>
      {/* 이미지 영역 */}
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
                borderTopLeftRadius: 10,
                borderTopRightRadius: 10,
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
              borderTopLeftRadius: 10,
              borderTopRightRadius: 10,
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

        {/* 하단 그라데이션 */}
        {Platform.OS === 'web' && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '50%',
              background: 'linear-gradient(transparent, rgba(17,17,17,0.4))',
              pointerEvents: 'none' as const,
            }}
          />
        )}

        {/* 좌상단: StatusBadge */}
        {meetup.status && (
          <View style={styles.statusOverlay}>
            <StatusBadge status={meetup.status} size="sm" />
          </View>
        )}

        {/* 우하단: 참가자수 pill */}
        <View style={styles.participantPill}>
          <View style={styles.participantPillInner}>
            <Icon name="users" size={9} color={COLORS.text.white} />
            <Text style={styles.participantPillText}>{participantText}</Text>
          </View>
        </View>
      </View>

      {/* 콘텐츠 영역 */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {meetup.title}
        </Text>
        <MeetupTags meetup={meetup} size="sm" maxTags={2} />
        <Text style={styles.metaText} numberOfLines={1}>
          {formatMeetupDateTime(meetup.date, meetup.time)} · {meetup.location || '위치 미정'}
        </Text>
      </View>
    </>
  );

  // ─── Web ─────────────────────────────────────────────────
  if (Platform.OS === 'web') {
    return (
      <div
        onClick={() => onPress(meetup)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        role="article"
        aria-label={`${meetup.title}, ${meetup.category}, ${participantText}`}
        className="card-hover"
        style={{
          width,
          backgroundColor: COLORS.neutral.white,
          borderRadius: 10,
          overflow: 'hidden',
          boxShadow: isHovered
            ? CSS_SHADOWS.cardHover || CSS_SHADOWS.hover
            : CSS_SHADOWS.card,
          transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
          transition: 'transform 200ms ease, box-shadow 200ms ease',
          cursor: 'pointer',
          border: `1px solid ${CARD_STYLE.borderColor}`,
          flexShrink: 0,
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'scale(0.98)';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = isHovered ? 'translateY(-3px)' : 'translateY(0)';
        }}
      >
        {gridContent}
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
        style={[
          styles.card,
          { width, transform: [{ scale: scaleAnim }] },
        ]}
      >
        {gridContent}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: CARD_STYLE.borderWidth,
    borderColor: CARD_STYLE.borderColor,
  },
  imageContainer: {
    width: '100%',
    height: 140,
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
  },
  statusOverlay: {
    position: 'absolute',
    top: 6,
    left: 6,
  },
  participantPill: {
    position: 'absolute',
    bottom: 6,
    right: 6,
  },
  participantPillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(17,17,17,0.55)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  participantPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.text.white,
  },
  content: {
    padding: 10,
    gap: 3,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    letterSpacing: -0.2,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
});

export default MeetupGridCard;
