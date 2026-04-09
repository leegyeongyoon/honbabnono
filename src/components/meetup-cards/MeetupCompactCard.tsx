import React, { useRef, useState } from 'react';
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
import { BORDER_RADIUS, SPACING } from '../../styles/spacing';
import { processImageUrl } from '../../utils/imageUtils';
import { formatMeetupDateTime } from '../../utils/dateUtils';
import { getChatTimeDifference } from '../../utils/timeUtils';
import type { MeetupCardBaseProps } from './types';
import { getUrgencyInfo, formatDistance, getParticipantStatus } from './types';
import { getCategoryByName } from '../../constants/categories';
import { Icon } from '../Icon';

interface MeetupCompactCardProps extends MeetupCardBaseProps {
  distance?: number;
}

const GENDER_EXCLUDE = ['무관', '상관없음', '혼성'];

const MeetupCompactCard: React.FC<MeetupCompactCardProps> = ({ meetup, onPress, distance }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

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

  // Figma home/list pattern for web
  const webContent = Platform.OS === 'web' ? (
    <View style={styles.rowFigma}>
      {/* 썸네일: 70x70, borderRadius 16 */}
      <View style={styles.imageContainerFigma}>
        <img
          src={processImageUrl(meetup.image, meetup.category)}
          loading="lazy"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: 16,
          }}
          alt={meetup.title}
        />
      </View>

      {/* 텍스트 영역 */}
      <View style={styles.textAreaFigma}>
        {/* 1행: 제목 16px SemiBold #121212 */}
        <Text style={styles.titleFigma} numberOfLines={1}>
          {meetup.title}
        </Text>

        {/* 2행: 설명 14px Regular #293038 */}
        <Text style={styles.descFigma} numberOfLines={1}>
          {meetup.category}
          {meetup.location ? ` · ${meetup.location}` : ''}
          {meetup.priceRange ? ` · ${meetup.priceRange}` : ''}
        </Text>

        {/* 3행: 메타 — 장소 + 인원 + 시간 */}
        <View style={styles.metaRowFigma}>
          <View style={styles.metaGroupFigma}>
            <View style={styles.metaItemFigma}>
              <Icon name="map-pin" size={12} color="#878b94" />
              <Text style={styles.metaTextFigma} numberOfLines={1}>
                {meetup.location || '위치 미정'}
              </Text>
            </View>
            <View style={[styles.metaItemFigma, { flexShrink: 0 }]}>
              <Icon name="user" size={12} color="#878b94" />
              <Text style={styles.metaTextFigma}>{participantText}</Text>
            </View>
          </View>
          <Text style={styles.metaTimeFigma}>
            {getChatTimeDifference(meetup.updatedAt || meetup.createdAt)}
          </Text>
        </View>
      </View>
    </View>
  ) : null;

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

  // ─── Web (Figma home/list pattern) ──────────────────────
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
          padding: '16px 20px',
          backgroundColor: isPressed
            ? COLORS.neutral.grey100
            : isHovered
              ? COLORS.neutral.grey50
              : COLORS.neutral.white,
          cursor: 'pointer',
          transition: 'background-color 120ms ease',
        }}
      >
        {webContent}
      </div>
    );
  }

  // ─── Native ──────────────────────────────────────────────
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={() => onPress(meetup)}
    >
      <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
        {meetup.status === 'recruiting' && (
          <View style={styles.recruitingAccent} />
        )}
        {compactContent}
      </Animated.View>
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
  // ─── Figma home/list pattern (web only) ────────────────
  rowFigma: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    flex: 1,
  },
  imageContainerFigma: {
    width: 70,
    height: 70,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: COLORS.neutral.grey100,
    flexShrink: 0,
  },
  textAreaFigma: {
    flex: 1,
    gap: 3,
  },
  titleFigma: {
    fontSize: 16,
    fontWeight: '600',
    color: '#121212',
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  descFigma: {
    fontSize: 14,
    fontWeight: '400',
    color: '#293038',
    letterSpacing: -0.8,
    lineHeight: 20,
  },
  metaRowFigma: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  metaGroupFigma: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    flex: 1,
    overflow: 'hidden',
  },
  metaItemFigma: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 1,
    overflow: 'hidden',
  },
  metaTextFigma: {
    fontSize: 14,
    fontWeight: '400',
    color: '#878b94',
    lineHeight: 20,
  },
  metaTimeFigma: {
    fontSize: 14,
    fontWeight: '400',
    color: '#121212',
    lineHeight: 20,
    flexShrink: 0,
    marginLeft: 8,
  },
  // ─── Original native styles ────────────────────────────
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
  recruitingAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: COLORS.functional.success,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
});

export default MeetupCompactCard;
