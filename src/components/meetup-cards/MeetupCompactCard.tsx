import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { COLORS, CSS_SHADOWS } from '../../styles/colors';
import { BORDER_RADIUS, SPACING } from '../../styles/spacing';
import { processImageUrl } from '../../utils/imageUtils';
import { formatMeetupDateTime } from '../../utils/dateUtils';
import type { MeetupCardBaseProps } from './types';
import { getUrgencyInfo, formatDistance, getParticipantStatus } from './types';
import { getCategoryByName } from '../../constants/categories';

interface MeetupCompactCardProps extends MeetupCardBaseProps {
  distance?: number;
}

const GENDER_EXCLUDE = ['무관', '상관없음', '혼성'];

const MeetupCompactCard: React.FC<MeetupCompactCardProps> = ({ meetup, onPress, distance }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const currentP = meetup.currentParticipants ?? 0;
  const maxP = meetup.maxParticipants ?? 4;
  const participantText = `${currentP}/${maxP}명`;
  const participantStatus = getParticipantStatus(currentP, maxP);
  const urgencyInfo =
    meetup.status === 'recruiting'
      ? getUrgencyInfo(meetup.date, meetup.time, currentP, maxP)
      : null;
  const distanceText = formatDistance(distance ?? meetup.distance);
  const cat = getCategoryByName(meetup.category);
  const catColor = cat?.color ?? COLORS.primary.main;

  // 성별 표시 여부
  const showGender =
    meetup.genderPreference && !GENDER_EXCLUDE.includes(meetup.genderPreference);

  const compactContent = (
    <View style={styles.row}>
      {/* 썸네일 */}
      <View style={styles.imageContainer}>
        {Platform.OS === 'web' ? (
          <img
            src={processImageUrl(meetup.image, meetup.category)}
            loading="lazy"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: 12,
            }}
            alt={meetup.title}
          />
        ) : (
          <Image
            source={{ uri: processImageUrl(meetup.image, meetup.category) }}
            style={styles.image}
          />
        )}
      </View>

      {/* 텍스트 영역 */}
      <View style={styles.textArea}>
        {/* 1행: 카테고리 + 성별 (인라인 태그) */}
        <View style={styles.tagRow}>
          <View style={[styles.categoryTag, { backgroundColor: catColor }]}>
            <Text style={styles.categoryText}>{meetup.category}</Text>
          </View>
          {showGender && (
            <View style={styles.genderTag}>
              <Text style={styles.genderText}>{meetup.genderPreference}</Text>
            </View>
          )}
          {urgencyInfo && (
            <View style={[styles.urgencyTag, { backgroundColor: urgencyInfo.color }]}>
              <Text style={styles.urgencyText}>{urgencyInfo.label}</Text>
            </View>
          )}
        </View>

        {/* 2행: 제목 */}
        <Text style={styles.title} numberOfLines={1}>
          {meetup.title}
        </Text>

        {/* 3행: 날짜 · 장소 */}
        <Text style={styles.meta} numberOfLines={1}>
          {formatMeetupDateTime(meetup.date, meetup.time)}
          {meetup.location ? ` · ${meetup.location}` : ''}
          {distanceText ? ` · ${distanceText}` : ''}
        </Text>

        {/* 4행: 참가자 + 상태뱃지 + 가격 */}
        <View style={styles.bottomRow}>
          <View style={styles.participantWrap}>
            <View style={[styles.participantDot, {
              backgroundColor: participantStatus.type === 'closed' ? COLORS.functional.error :
                               participantStatus.type === 'closing_soon' ? COLORS.functional.warning :
                               COLORS.functional.success,
            }]} />
            <Text style={styles.participantText}>{participantText}</Text>
            {participantStatus.type !== 'open' && (
              <View style={[styles.statusBadge, { backgroundColor: participantStatus.bgColor }]}>
                <Text style={[styles.statusBadgeText, { color: participantStatus.color }]}>
                  {participantStatus.label}
                </Text>
              </View>
            )}
          </View>
          {meetup.priceRange && (
            <Text style={styles.priceText}>{meetup.priceRange}</Text>
          )}
          {meetup.promiseDepositAmount ? (
            <Text style={styles.depositText}>보증금</Text>
          ) : null}
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
          padding: '14px 20px',
          backgroundColor: isPressed
            ? COLORS.neutral.grey100
            : isHovered
              ? COLORS.neutral.grey50
              : COLORS.neutral.white,
          cursor: 'pointer',
          transition: 'background-color 120ms ease, box-shadow 120ms ease',
          borderBottom: `1px solid ${COLORS.neutral.grey100}`,
          boxShadow: isHovered ? '0 1px 4px rgba(0,0,0,0.04)' : 'none',
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
      style={styles.card}
    >
      {compactContent}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  imageContainer: {
    width: 88,
    height: 88,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.neutral.grey100,
    flexShrink: 0,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderRadius: 12,
  },

  // ─── 텍스트 ───────────────────────────────
  textArea: {
    flex: 1,
    gap: 4,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categoryTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.text.white,
    letterSpacing: 0.1,
  },
  genderTag: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#FFF0F5',
    borderWidth: 1,
    borderColor: 'rgba(219,112,147,0.15)',
  },
  genderText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#C7254E',
  },
  urgencyTag: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.text.white,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
    letterSpacing: -0.2,
    lineHeight: 21,
  },
  meta: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    lineHeight: 18,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 1,
  },
  participantWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  participantDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  participantText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  priceText: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  depositText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.special.deposit,
    backgroundColor: COLORS.functional.successLight,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    overflow: 'hidden',
  },
  statusBadge: {
    marginLeft: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
});

export default MeetupCompactCard;
