import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { COLORS } from '../../styles/colors';
import { BORDER_RADIUS } from '../../styles/spacing';
import { processImageUrl } from '../../utils/imageUtils';
import { formatMeetupDateTime } from '../../utils/dateUtils';
import StatusBadge from './StatusBadge';
import MeetupTags from './MeetupTags';
import type { MeetupCardBaseProps } from './types';
import { getUrgencyInfo, formatDistance } from './types';

interface MeetupCompactCardProps extends MeetupCardBaseProps {
  distance?: number;
}

const MeetupCompactCard: React.FC<MeetupCompactCardProps> = ({ meetup, onPress, distance }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const currentP = meetup.currentParticipants ?? 0;
  const maxP = meetup.maxParticipants ?? 4;
  const participantText = `${currentP}/${maxP}명`;
  const urgencyInfo =
    meetup.status === 'recruiting'
      ? getUrgencyInfo(meetup.date, meetup.time, currentP, maxP)
      : null;
  const showLeftAccent = meetup.status === 'recruiting' || !!urgencyInfo;
  const distanceText = formatDistance(distance ?? meetup.distance);

  const compactContent = (
    <View style={styles.row}>
      {/* 썸네일 */}
      <View style={styles.imageContainer}>
        {Platform.OS === 'web' ? (
          <img
            src={processImageUrl(meetup.image, meetup.category)}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: 10,
            }}
            alt={meetup.title}
          />
        ) : (
          <Image
            source={{ uri: processImageUrl(meetup.image, meetup.category) }}
            style={styles.image}
            onLoad={() => setImageLoaded(true)}
          />
        )}
        {/* StatusBadge 좌상단 */}
        {meetup.status && (
          <View style={styles.statusOverlay}>
            <StatusBadge status={meetup.status} size="sm" />
          </View>
        )}
      </View>

      {/* 텍스트 영역 */}
      <View style={styles.textArea}>
        {/* 1행: 제목 */}
        <Text style={styles.title} numberOfLines={1}>
          {meetup.title}
        </Text>

        {/* 2행: 호스트 */}
        {meetup.hostName && (
          <Text style={styles.hostName} numberOfLines={1}>
            {meetup.hostName}
          </Text>
        )}

        {/* 3행: 태그 (최대 3개 sm) */}
        <MeetupTags meetup={meetup} size="sm" maxTags={3} />

        {/* 4행: 날짜 · 위치 · 참가자수 */}
        <View style={styles.metaRow}>
          <Text style={styles.metaText} numberOfLines={1}>
            {formatMeetupDateTime(meetup.date, meetup.time)}
          </Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText} numberOfLines={1}>
            {meetup.location || '위치 미정'}
          </Text>
          {distanceText && (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaText}>{distanceText}</Text>
            </>
          )}
          <Text style={styles.metaDot}>·</Text>
          <Text style={[styles.metaText, styles.participantText]}>
            {participantText}
          </Text>
        </View>
      </View>
    </View>
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
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          padding: '16px 16px',
          backgroundColor: isPressed
            ? COLORS.neutral.grey100
            : isHovered
              ? COLORS.neutral.grey50
              : COLORS.neutral.white,
          cursor: 'pointer',
          transition: 'background-color 120ms ease',
          borderBottom: `1px solid ${COLORS.neutral.grey100}`,
          borderLeft: showLeftAccent
            ? `3px solid ${COLORS.primary.main}`
            : '3px solid transparent',
        }}
      >
        {compactContent}
      </div>
    );
  }

  // ─── Native ──────────────────────────────────────────────
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(meetup)}
      style={[
        styles.card,
        showLeftAccent && { borderLeftWidth: 3, borderLeftColor: COLORS.primary.main },
      ]}
    >
      {compactContent}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: COLORS.neutral.grey100,
    flexShrink: 0,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderRadius: 10,
  },
  statusOverlay: {
    position: 'absolute',
    top: 4,
    left: 4,
  },
  textArea: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
    letterSpacing: -0.2,
  },
  hostName: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
  },
  metaText: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    flexShrink: 1,
  },
  metaDot: {
    fontSize: 12,
    color: COLORS.neutral.grey300,
    marginHorizontal: 4,
  },
  participantText: {
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
});

export default MeetupCompactCard;
