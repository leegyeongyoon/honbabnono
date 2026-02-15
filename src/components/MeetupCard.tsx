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
import { COLORS, SHADOWS, CSS_SHADOWS, CARD_STYLE } from '../styles/colors';
import { TYPOGRAPHY } from '../styles/typography';
import { SPACING, BORDER_RADIUS } from '../styles/spacing';
import { processImageUrl } from '../utils/imageUtils';
import { formatMeetupDateTime } from '../utils/dateUtils';
import { FOOD_CATEGORIES } from '../constants/categories';
import { Icon } from './Icon';
import { getAvatarColor, getInitials } from '../utils/avatarColor';

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
  variant?: 'list' | 'grid' | 'compact';
}

const MeetupCard: React.FC<MeetupCardProps> = ({ meetup, onPress, variant = 'list' }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const currentP = meetup.currentParticipants ?? 0;
  const maxP = meetup.maxParticipants ?? 4;
  const participantText = `${currentP}/${maxP}명`;
  const locationText = formatDistance(meetup.distance) || meetup.address || meetup.location || '위치 미정';
  const statusConfig = meetup.status ? STATUS_CONFIG[meetup.status] : null;
  const participantRatio = maxP > 0 ? currentP / maxP : 0;

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

  // ─── Compact Variant (세로 리스트용) ────────────────────────
  if (variant === 'compact') {
    const compactContent = (
      <View style={compactStyles.row}>
        {/* 썸네일 이미지 */}
        <View style={compactStyles.imageContainer}>
          {Platform.OS === 'web' ? (
            <img
              src={processImageUrl(meetup.image, meetup.category)}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
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
              style={compactStyles.image}
              onLoad={() => setImageLoaded(true)}
            />
          )}
          {/* 상태 뱃지 오버레이 */}
          {statusConfig && (
            <View style={[compactStyles.statusOverlay, { backgroundColor: statusConfig.bg }]}>
              <Text style={compactStyles.statusOverlayText}>{statusConfig.label}</Text>
            </View>
          )}
        </View>

        {/* 텍스트 영역 */}
        <View style={compactStyles.textArea}>
          {/* 1행: 제목 */}
          <Text style={compactStyles.title} numberOfLines={1}>
            {meetup.title}
          </Text>
          {/* 2행: 날짜/시간 + 위치 */}
          <View style={compactStyles.metaRow}>
            <Icon name="calendar" size={11} color={COLORS.text.tertiary} />
            <Text style={compactStyles.metaText} numberOfLines={1}>
              {formatMeetupDateTime(meetup.date, meetup.time)}
            </Text>
            <Text style={compactStyles.metaDot}> · </Text>
            <Icon name="map-pin" size={11} color={COLORS.text.tertiary} />
            <Text style={compactStyles.metaText} numberOfLines={1}>
              {meetup.location || '위치 미정'}
            </Text>
          </View>
          {/* 3행: 호스트 + 가격대 */}
          <View style={compactStyles.metaRow}>
            {meetup.hostName ? (
              <>
                <Text style={compactStyles.hostText}>주최: {meetup.hostName}</Text>
              </>
            ) : (
              <Text style={compactStyles.hostText}>{meetup.category}</Text>
            )}
            {meetup.priceRange ? (
              <>
                <Text style={compactStyles.metaDot}> · </Text>
                <Text style={compactStyles.priceText}>{meetup.priceRange}</Text>
              </>
            ) : null}
          </View>
          {/* 4행: 인원수 + 소형 프로그레스바 */}
          <View style={compactStyles.participantRow}>
            <Icon name="users" size={11} color={COLORS.primary.main} />
            <Text style={compactStyles.participantText}> {participantText}</Text>
            <View style={compactStyles.progressBg}>
              <View
                style={[
                  compactStyles.progressFill,
                  {
                    width: `${Math.min(participantRatio * 100, 100)}%` as unknown as number,
                    backgroundColor:
                      currentP >= maxP
                        ? COLORS.functional.error
                        : participantRatio > 0.8
                          ? COLORS.functional.warning
                          : COLORS.primary.main,
                  },
                ]}
              />
            </View>
          </View>
        </View>
      </View>
    );

    if (Platform.OS === 'web') {
      return (
        <div
          onClick={() => onPress(meetup)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          role="article"
          aria-label={`${meetup.title}, ${meetup.category}, ${participantText}`}
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            padding: '12px 20px',
            backgroundColor: isHovered ? COLORS.neutral.light : COLORS.neutral.white,
            cursor: 'pointer',
            transition: 'background-color 150ms ease',
            borderBottom: `1px solid ${COLORS.neutral.grey100}`,
          }}
        >
          {compactContent}
        </div>
      );
    }

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onPress(meetup)}
        style={compactStyles.card}
      >
        {compactContent}
      </TouchableOpacity>
    );
  }

  // ─── Grid Variant ─────────────────────────────────────
  if (variant === 'grid') {
    const gridContent = (
      <>
        {/* 이미지 (16:10 비율) */}
        <View style={gridStyles.imageContainer}>
          {!imageLoaded && (
            Platform.OS === 'web' ? (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: COLORS.neutral.grey100,
                borderTopLeftRadius: CARD_STYLE.borderRadius,
                borderTopRightRadius: CARD_STYLE.borderRadius,
                overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: `linear-gradient(90deg, ${COLORS.neutral.grey100} 25%, ${COLORS.neutral.grey200} 50%, ${COLORS.neutral.grey100} 75%)`,
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s infinite',
                }} />
              </div>
            ) : (
              <View style={gridStyles.imageSkeleton} />
            )
          )}
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
                borderTopLeftRadius: CARD_STYLE.borderRadius,
                borderTopRightRadius: CARD_STYLE.borderRadius,
              }}
              alt={meetup.title}
            />
          ) : (
            <Image
              source={{ uri: processImageUrl(meetup.image, meetup.category) }}
              style={[gridStyles.image, { opacity: imageLoaded ? 1 : 0 }]}
              onLoad={() => setImageLoaded(true)}
            />
          )}
          {/* 상태 뱃지 오버레이 */}
          {statusConfig && (
            <View style={[gridStyles.statusOverlay, { backgroundColor: statusConfig.bg }]}>
              <Text style={gridStyles.statusText}>{statusConfig.label}</Text>
            </View>
          )}
        </View>

        {/* 컨텐츠 영역 */}
        <View style={gridStyles.content}>
          {/* 카테고리 태그 */}
          <View style={gridStyles.categoryTag}>
            <Text style={gridStyles.categoryTagText}>{meetup.category}</Text>
          </View>

          {/* 제목 */}
          <Text style={gridStyles.title} numberOfLines={2}>
            {meetup.title}
          </Text>

          {/* 날짜 */}
          <View style={gridStyles.metaRow}>
            <Icon name="calendar" size={12} color={COLORS.primary.main} />
            <Text style={gridStyles.metaText}>
              {' '}{formatMeetupDateTime(meetup.date, meetup.time)}
            </Text>
          </View>

          {/* 위치 */}
          <View style={gridStyles.metaRow}>
            <Icon name="map-pin" size={12} color={COLORS.primary.main} />
            <Text style={gridStyles.metaText} numberOfLines={1}>
              {' '}{locationText}
            </Text>
          </View>

          {/* 참가자 프로그레스바 */}
          <View style={gridStyles.participantRow}>
            <Icon name="users" size={12} color={COLORS.primary.main} />
            <Text style={gridStyles.participantText}>{' '}{participantText}</Text>
            <View style={gridStyles.progressBg}>
              <View
                style={[
                  gridStyles.progressFill,
                  {
                    width: `${Math.min(participantRatio * 100, 100)}%` as unknown as number,
                    backgroundColor:
                      currentP >= maxP
                        ? COLORS.functional.error
                        : participantRatio > 0.8
                          ? COLORS.functional.warning
                          : COLORS.primary.main,
                  },
                ]}
              />
            </View>
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
          role="article"
          aria-label={`${meetup.title}, ${meetup.category}, ${participantText}`}
          style={{
            backgroundColor: COLORS.neutral.white,
            borderRadius: CARD_STYLE.borderRadius,
            overflow: 'hidden',
            boxShadow: isHovered ? CSS_SHADOWS.medium : CSS_SHADOWS.small,
            transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
            transition: 'transform 150ms ease, box-shadow 200ms ease',
            cursor: 'pointer',
            border: '1px solid rgba(0,0,0,0.04)',
          }}
        >
          {gridContent}
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
            gridStyles.card,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          {gridContent}
        </Animated.View>
      </TouchableOpacity>
    );
  }

  // ─── List Variant (기존) ─────────────────────────────────
  const cardContent = (
    <>
      {/* 썸네일 이미지 */}
      <View style={styles.imageContainer}>
        {!imageLoaded && (
          Platform.OS === 'web' ? (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: COLORS.neutral.grey100,
              borderRadius: BORDER_RADIUS.lg,
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `linear-gradient(90deg, ${COLORS.neutral.grey100} 25%, ${COLORS.neutral.grey200} 50%, ${COLORS.neutral.grey100} 75%)`,
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
              }} />
              <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
            </div>
          ) : (
            <View style={styles.imageSkeleton} />
          )
        )}
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
        {Platform.OS === 'web' && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.1) 100%)',
            borderRadius: BORDER_RADIUS.lg,
            pointerEvents: 'none' as const,
          }} />
        )}
      </View>

      {/* 컨텐츠 영역 */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {meetup.title}
        </Text>

        {meetup.hostName && (
          <View style={styles.hostRow}>
            {meetup.hostImage ? (
              <Image
                source={{ uri: meetup.hostImage }}
                style={styles.hostAvatar}
              />
            ) : (
              <View style={[styles.hostAvatarPlaceholder, { backgroundColor: getAvatarColor(meetup.hostName || '') }]}>
                <Text style={styles.hostAvatarInitial}>{getInitials(meetup.hostName || '')}</Text>
              </View>
            )}
            <Text style={styles.hostName}>{meetup.hostName}</Text>
            {meetup.hostRating != null && (
              <View style={styles.hostRatingContainer}>
                <Icon name="star" size={13} color={COLORS.functional.warning} solid />
                <Text style={styles.hostRating}>{meetup.hostRating.toFixed(1)}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.tagRow}>
          <View style={styles.categoryTag}>
            <Text style={styles.categoryTagText}>
              {meetup.category}
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

        <View style={styles.metaRow}>
          <Icon name="calendar" size={14} color={COLORS.primary.main} />
          <Text style={styles.metaText}>
            {' '}{formatMeetupDateTime(meetup.date, meetup.time)}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Icon name="map-pin" size={14} color={COLORS.primary.main} />
          <Text style={styles.metaText} numberOfLines={1}>
            {' '}{locationText}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.participantColumn}>
            <View style={styles.participantRow}>
              <Icon name="users" size={14} color={COLORS.primary.main} />
              <Text style={styles.participantHighlight}>
                {' '}{participantText}
              </Text>
            </View>
            <View style={styles.participantProgressBg}>
              <View
                style={[
                  styles.participantProgressFill,
                  {
                    width: `${Math.min(participantRatio * 100, 100)}%` as unknown as number,
                    backgroundColor:
                      currentP >= maxP
                        ? COLORS.functional.error
                        : participantRatio > 0.8
                          ? COLORS.functional.warning
                          : COLORS.primary.main,
                  },
                ]}
              />
            </View>
          </View>
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
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'scale(0.97)';
          e.currentTarget.style.boxShadow = '0 0px 2px rgba(0,0,0,0.02), 0 2px 4px rgba(0,0,0,0.02)';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = isHovered ? 'scale(1.01)' : 'scale(1)';
          e.currentTarget.style.boxShadow = isHovered ? CSS_SHADOWS.medium : CSS_SHADOWS.small;
        }}
        role="article"
        aria-label={`${meetup.title}, ${meetup.category}, ${participantText}`}
        style={{
          backgroundColor: COLORS.neutral.white,
          borderRadius: CARD_STYLE.borderRadius,
          padding: SPACING.lg,
          marginBottom: SPACING.md,
          display: 'flex',
          flexDirection: 'row' as const,
          alignItems: 'flex-start',
          gap: SPACING.md,
          boxShadow: isHovered
            ? '0 4px 12px rgba(0,0,0,0.08), 0 12px 28px rgba(0,0,0,0.12)'
            : '0 1px 3px rgba(0,0,0,0.06), 0 4px 8px rgba(0,0,0,0.06)',
          transform: isHovered ? 'scale(1.01)' : 'scale(1)',
          transition: 'transform 150ms ease, box-shadow 200ms ease',
          cursor: 'pointer',
          border: '1px solid rgba(0,0,0,0.04)',
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

// ─── Compact Variant Styles ─────────────────────────────────
const compactStyles = StyleSheet.create({
  card: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  imageContainer: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    backgroundColor: COLORS.neutral.grey100,
    flexShrink: 0,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderRadius: BORDER_RADIUS.md,
  },
  statusOverlay: {
    position: 'absolute',
    top: 4,
    left: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusOverlayText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.text.white,
  },
  textArea: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
  },
  metaText: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    marginLeft: 3,
    flexShrink: 1,
  },
  metaDot: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  hostText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  priceText: {
    fontSize: 12,
    color: COLORS.primary.dark,
    fontWeight: '600',
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 1,
  },
  participantText: {
    fontSize: 12,
    color: COLORS.primary.main,
    fontWeight: '700',
  },
  progressBg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.neutral.grey200,
    overflow: 'hidden',
    marginLeft: 6,
    maxWidth: 80,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});

// ─── Grid Variant Styles ─────────────────────────────────
const gridStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: CARD_STYLE.borderRadius,
    overflow: 'hidden',
    borderWidth: CARD_STYLE.borderWidth,
    borderColor: CARD_STYLE.borderColor,
    ...SHADOWS.small,
  },
  imageContainer: {
    width: '100%',
    height: 120,
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
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.text.white,
  },
  content: {
    padding: 12,
    gap: 4,
  },
  categoryTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: COLORS.primary.main,
  },
  categoryTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.text.white,
  },
  title: {
    ...TYPOGRAPHY.card.gridTitle,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    ...TYPOGRAPHY.card.gridMeta,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  participantText: {
    fontSize: 12,
    color: COLORS.primary.main,
    fontWeight: '700',
  },
  progressBg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.neutral.grey200,
    overflow: 'hidden',
    marginLeft: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});

// ─── List Variant Styles (기존) ─────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: CARD_STYLE.borderRadius,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    borderWidth: CARD_STYLE.borderWidth,
    borderColor: CARD_STYLE.borderColor,
    ...SHADOWS.medium,
  },
  imageContainer: {
    width: 96,
    height: 96,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    position: 'relative',
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
    borderRadius: BORDER_RADIUS.lg,
  },
  content: {
    flex: 1,
    gap: 8,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  hostAvatarInitial: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text.white,
  },
  hostRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hostName: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  hostRating: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginLeft: 2,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  categoryTag: {
    minHeight: 26,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: COLORS.primary.main,
    justifyContent: 'center',
  },
  categoryTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.white,
  },
  priceTag: {
    minHeight: 26,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: COLORS.primary.light,
    borderWidth: 1,
    borderColor: 'rgba(107, 79, 14, 0.15)',
    justifyContent: 'center',
  },
  priceTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary.dark,
  },
  ageTag: {
    minHeight: 26,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: COLORS.functional.info + '20',
    borderWidth: 1,
    borderColor: 'rgba(107, 78, 175, 0.15)',
    justifyContent: 'center',
  },
  ageTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.functional.info,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  participantColumn: {
    gap: 4,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantHighlight: {
    fontSize: 14,
    color: COLORS.primary.main,
    fontWeight: '700',
  },
  participantProgressBg: {
    width: 60,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.neutral.grey200,
    overflow: 'hidden',
  },
  participantProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text.white,
  },
});

export default MeetupCard;
