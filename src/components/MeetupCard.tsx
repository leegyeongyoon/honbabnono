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
import { SPACING, BORDER_RADIUS, LIST_ITEM_STYLE } from '../styles/spacing';
import { processImageUrl } from '../utils/imageUtils';
import { formatMeetupDateTime } from '../utils/dateUtils';
import { FOOD_CATEGORIES, getCategoryByName } from '../constants/categories';
import { CATEGORY_COLORS } from '../styles/colors';
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
  promiseDepositAmount?: number;
  participants?: Array<{ name: string; profileImage?: string }>;
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
  recruiting: { label: '모집중', bg: COLORS.functional.success, pulse: true },
  confirmed: { label: '모집완료', bg: COLORS.neutral.grey500, pulse: false },
  in_progress: { label: '진행중', bg: COLORS.primary.main, pulse: false },
  completed: { label: '완료', bg: COLORS.neutral.grey400, pulse: false },
  cancelled: { label: '취소됨', bg: COLORS.functional.error, pulse: false },
} as const;

// 마감 임박 계산
const getUrgencyInfo = (date: string, time: string, currentP: number, maxP: number) => {
  const now = new Date();
  const meetupDate = new Date(date);
  const diffHours = (meetupDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  const spotsLeft = maxP - currentP;

  if (spotsLeft === 1) return { label: '1자리 남음', color: COLORS.special.hot };
  if (diffHours > 0 && diffHours < 3) return { label: '곧 마감', color: COLORS.special.hot };
  if (diffHours > 0 && diffHours < 12) return { label: '오늘 마감', color: COLORS.functional.warning };
  return null;
};

interface MeetupCardProps {
  meetup: Meetup;
  onPress: (meetup: Meetup) => void;
  variant?: 'list' | 'grid' | 'compact';
}

const MeetupCard: React.FC<MeetupCardProps> = ({ meetup, onPress, variant = 'list' }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const currentP = meetup.currentParticipants ?? 0;
  const maxP = meetup.maxParticipants ?? 4;
  const participantText = `${currentP}/${maxP}명`;
  const locationText = formatDistance(meetup.distance) || meetup.address || meetup.location || '위치 미정';
  const statusConfig = meetup.status ? STATUS_CONFIG[meetup.status] : null;
  const participantRatio = maxP > 0 ? currentP / maxP : 0;
  const urgencyInfo = meetup.status === 'recruiting' ? getUrgencyInfo(meetup.date, meetup.time, currentP, maxP) : null;

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

  // 참가자 아바타 스택 (겹쳐진 원형 프로필)
  const ParticipantAvatarStack = ({ size = 20, maxShow = 3 }: { size?: number; maxShow?: number }) => {
    const participants = meetup.participants || [];
    const showCount = Math.min(participants.length, maxShow);
    const remaining = currentP - showCount;

    if (currentP === 0) return null;

    return (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {participants.slice(0, showCount).map((p, i) => (
          <View
            key={i}
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              marginLeft: i > 0 ? -size * 0.3 : 0,
              borderWidth: 1.5,
              borderColor: COLORS.neutral.white,
              overflow: 'hidden',
              zIndex: showCount - i,
            }}
          >
            {p.profileImage ? (
              Platform.OS === 'web' ? (
                <img
                  src={p.profileImage}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  alt={p.name}
                />
              ) : (
                <Image source={{ uri: p.profileImage }} style={{ width: '100%', height: '100%' }} />
              )
            ) : (
              <View style={{
                width: '100%',
                height: '100%',
                backgroundColor: getAvatarColor(p.name),
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Text style={{ fontSize: size * 0.4, fontWeight: '600', color: COLORS.text.white }}>
                  {getInitials(p.name)}
                </Text>
              </View>
            )}
          </View>
        ))}
        {remaining > 0 && (
          <View style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            marginLeft: -size * 0.3,
            borderWidth: 1.5,
            borderColor: COLORS.neutral.white,
            backgroundColor: COLORS.neutral.grey200,
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 0,
          }}>
            <Text style={{ fontSize: size * 0.35, fontWeight: '600', color: COLORS.text.secondary }}>
              +{remaining}
            </Text>
          </View>
        )}
      </View>
    );
  };

  // ─── Compact Variant ────────────────────────────────────────
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
                borderRadius: 8,
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
          {/* 1행: 제목 + 긴급 태그 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={compactStyles.title} numberOfLines={1}>
              {meetup.title}
            </Text>
            {urgencyInfo && (
              <View style={[compactStyles.urgencyBadge, { backgroundColor: urgencyInfo.color }]}>
                <Text style={compactStyles.urgencyText}>{urgencyInfo.label}</Text>
              </View>
            )}
          </View>
          {/* 2행: 필수 성향 태그 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            {meetup.genderPreference && !['무관', '상관없음', '혼성'].includes(meetup.genderPreference) && (
              <View style={[styles.genderTag, { minHeight: 18, paddingHorizontal: 5, paddingVertical: 1 }]}>
                <Text style={[styles.genderTagText, { fontSize: 9 }]}>{meetup.genderPreference}</Text>
              </View>
            )}
            {meetup.ageRange && !['무관', '상관없음'].includes(meetup.ageRange) && (
              <View style={[styles.ageTag, { minHeight: 18, paddingHorizontal: 5, paddingVertical: 1 }]}>
                <Text style={[styles.ageTagText, { fontSize: 9 }]}>{meetup.ageRange}</Text>
              </View>
            )}
            {meetup.priceRange && (
              <View style={[styles.priceTag, { minHeight: 18, paddingHorizontal: 5, paddingVertical: 1 }]}>
                <Text style={[styles.priceTagText, { fontSize: 9 }]}>{meetup.priceRange}</Text>
              </View>
            )}
            {meetup.promiseDepositAmount ? (
              <View style={[styles.depositTag, { minHeight: 18, paddingHorizontal: 5, paddingVertical: 1 }]}>
                <Text style={[styles.depositTagText, { fontSize: 9 }]}>보증금 {meetup.promiseDepositAmount.toLocaleString()}원</Text>
              </View>
            ) : null}
          </View>
          {/* 3행: 날짜 · 위치 · 인원 */}
          <View style={compactStyles.metaRow}>
            <Text style={compactStyles.metaText} numberOfLines={1}>
              {formatMeetupDateTime(meetup.date, meetup.time)}
            </Text>
            <Text style={compactStyles.metaDot}>·</Text>
            <Text style={compactStyles.metaText} numberOfLines={1}>
              {meetup.location || '위치 미정'}
            </Text>
            <Text style={compactStyles.metaDot}>·</Text>
            <Text style={[compactStyles.metaText, { color: COLORS.text.secondary, fontWeight: '600' as any }]}>
              {participantText}
            </Text>
          </View>
        </View>
      </View>
    );

    // Left accent for recruiting or hot meetups
    const showLeftAccent = meetup.status === 'recruiting' || !!urgencyInfo;

    if (Platform.OS === 'web') {
      return (
        <div
          onClick={() => onPress(meetup)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => { setIsHovered(false); setIsPressed(false); }}
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
            borderLeft: showLeftAccent ? `3px solid ${COLORS.primary.main}` : '3px solid transparent',
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
        style={[
          compactStyles.card,
          showLeftAccent && { borderLeftWidth: 3, borderLeftColor: COLORS.primary.main },
        ]}
      >
        {compactContent}
      </TouchableOpacity>
    );
  }

  // ─── Grid Variant ───────────────────────────────────────────
  if (variant === 'grid') {
    const gridContent = (
      <>
        {/* 이미지 (컴팩트) */}
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
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
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
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
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
          {/* 하단 그라데이션 */}
          {Platform.OS === 'web' && (
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '50%',
              background: 'linear-gradient(transparent, rgba(17,17,17,0.4))',
              pointerEvents: 'none' as const,
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
            }} />
          )}
          {/* 상태 + 카테고리 뱃지 (이미지 위) */}
          <View style={{ position: 'absolute', top: 6, left: 6, flexDirection: 'row', gap: 4 }}>
            {statusConfig && (
              <View style={[gridStyles.statusOverlay, { backgroundColor: statusConfig.bg }]}>
                <Text style={gridStyles.statusText}>{statusConfig.label}</Text>
              </View>
            )}
            {urgencyInfo && (
              <View style={[gridStyles.statusOverlay, { backgroundColor: urgencyInfo.color }]}>
                <Text style={gridStyles.statusText}>{urgencyInfo.label}</Text>
              </View>
            )}
          </View>
          {/* 하단: 인원 뱃지 (이미지 위) */}
          <View style={{ position: 'absolute', bottom: 6, right: 6 }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 3,
              backgroundColor: 'rgba(17,17,17,0.55)',
              paddingHorizontal: 6,
              paddingVertical: 3,
              borderRadius: 6,
            }}>
              <Icon name="users" size={9} color={COLORS.text.white} />
              <Text style={{ fontSize: 10, fontWeight: '600' as any, color: COLORS.text.white }}>{participantText}</Text>
            </View>
          </View>
        </View>

        {/* 컨텐츠 영역 (컴팩트) */}
        <View style={gridStyles.content}>
          <Text style={gridStyles.title} numberOfLines={1}>
            {meetup.title}
          </Text>
          <View style={{ flexDirection: 'row', gap: 3, flexWrap: 'wrap', marginTop: 2 }}>
            {meetup.genderPreference && !['무관', '상관없음', '혼성'].includes(meetup.genderPreference) && (
              <View style={[styles.genderTag, { minHeight: 16, paddingHorizontal: 4, paddingVertical: 0 }]}>
                <Text style={[styles.genderTagText, { fontSize: 9 }]}>{meetup.genderPreference}</Text>
              </View>
            )}
            {meetup.ageRange && !['무관', '상관없음'].includes(meetup.ageRange) && (
              <View style={[styles.ageTag, { minHeight: 16, paddingHorizontal: 4, paddingVertical: 0 }]}>
                <Text style={[styles.ageTagText, { fontSize: 9 }]}>{meetup.ageRange}</Text>
              </View>
            )}
            {meetup.priceRange && (
              <View style={[styles.priceTag, { minHeight: 16, paddingHorizontal: 4, paddingVertical: 0 }]}>
                <Text style={[styles.priceTagText, { fontSize: 9 }]}>{meetup.priceRange}</Text>
              </View>
            )}
            {meetup.promiseDepositAmount ? (
              <View style={[styles.depositTag, { minHeight: 16, paddingHorizontal: 4, paddingVertical: 0 }]}>
                <Text style={[styles.depositTagText, { fontSize: 9 }]}>보증금 {meetup.promiseDepositAmount.toLocaleString()}원</Text>
              </View>
            ) : null}
          </View>
          <Text style={gridStyles.metaText} numberOfLines={1}>
            {formatMeetupDateTime(meetup.date, meetup.time)} · {meetup.location || '위치 미정'}
          </Text>
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
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: isHovered ? CSS_SHADOWS.cardHover || CSS_SHADOWS.hover : CSS_SHADOWS.card,
            transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
            transition: 'transform 200ms ease, box-shadow 200ms ease',
            cursor: 'pointer',
            border: `1px solid ${CARD_STYLE.borderColor}`,
          }}
          onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = isHovered ? 'translateY(-2px)' : 'translateY(0)'; }}
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

  // ─── List Variant (기본) ─────────────────────────────────────
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
              borderRadius: BORDER_RADIUS.md,
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
      </View>

      {/* 컨텐츠 영역 */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {meetup.title}
        </Text>

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
                <Image
                  source={{ uri: meetup.hostImage }}
                  style={styles.hostAvatar}
                />
              )
            ) : (
              <View style={[styles.hostAvatarPlaceholder, { backgroundColor: getAvatarColor(meetup.hostName || '') }]}>
                <Text style={styles.hostAvatarInitial}>{getInitials(meetup.hostName || '')}</Text>
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

        <View style={styles.tagRow}>
          {(() => {
            const cat = getCategoryByName(meetup.category);
            return (
              <View style={[styles.categoryTag, cat && { backgroundColor: cat.color }]}>
                <Text style={styles.categoryTagText}>
                  {meetup.category}
                </Text>
              </View>
            );
          })()}
          {meetup.priceRange && (
            <View style={styles.priceTag}>
              <Text style={styles.priceTagText}>{meetup.priceRange}</Text>
            </View>
          )}
          {meetup.genderPreference && !['무관', '상관없음', '혼성'].includes(meetup.genderPreference) && (
            <View style={styles.genderTag}>
              <Text style={styles.genderTagText}>{meetup.genderPreference}</Text>
            </View>
          )}
          {meetup.ageRange && !['무관', '상관없음'].includes(meetup.ageRange) && (
            <View style={styles.ageTag}>
              <Text style={styles.ageTagText}>{meetup.ageRange}</Text>
            </View>
          )}
          {meetup.promiseDepositAmount ? (
            <View style={styles.depositTag}>
              <Text style={styles.depositTagText}>보증금 {meetup.promiseDepositAmount.toLocaleString()}원</Text>
            </View>
          ) : null}
          {urgencyInfo && (
            <View style={[styles.urgencyTag, { backgroundColor: urgencyInfo.color }]}>
              <Text style={styles.urgencyTagText}>{urgencyInfo.label}</Text>
            </View>
          )}
        </View>

        <View style={styles.metaRow}>
          <Icon name="calendar" size={13} color={COLORS.neutral.grey400} />
          <Text style={styles.metaText}>
            {' '}{formatMeetupDateTime(meetup.date, meetup.time)}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Icon name="map-pin" size={13} color={COLORS.neutral.grey400} />
          <Text style={styles.metaText} numberOfLines={1}>
            {' '}{locationText}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.participantColumn}>
            <View style={styles.participantRow}>
              <Icon name="users" size={13} color={COLORS.neutral.grey500} />
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
                          : COLORS.primary.accent,
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

  // Left accent for recruiting or hot meetups (list variant)
  const showListLeftAccent = meetup.status === 'recruiting' || !!urgencyInfo;

  if (Platform.OS === 'web') {
    return (
      <div
        onClick={() => onPress(meetup)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => { setIsHovered(false); setIsPressed(false); }}
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
          borderLeft: showListLeftAccent ? `3px solid ${COLORS.primary.main}` : '3px solid transparent',
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
    width: 52,
    height: 52,
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
    top: 3,
    left: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  statusOverlayText: {
    fontSize: 8,
    fontWeight: '600',
    color: COLORS.text.white,
  },
  textArea: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    letterSpacing: -0.2,
    flex: 1,
  },
  urgencyBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    flexShrink: 0,
  },
  urgencyText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.text.white,
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
});

// ─── Grid Variant Styles ─────────────────────────────────────
const gridStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: BORDER_RADIUS.md,
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.text.white,
  },
  content: {
    padding: 10,
    gap: 3,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.primary,
    letterSpacing: -0.2,
  },
  metaText: {
    fontSize: 11,
    color: COLORS.text.tertiary,
  },
});

// ─── List Variant Styles ─────────────────────────────────────
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
    width: 96,
    height: 96,
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
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  categoryTag: {
    minHeight: 24,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.primary.main,
    justifyContent: 'center',
  },
  categoryTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text.white,
    letterSpacing: 0.1,
  },
  priceTag: {
    minHeight: 24,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.neutral.light,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
    justifyContent: 'center',
  },
  priceTagText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.text.secondary,
  },
  genderTag: {
    minHeight: 24,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: '#FFF0F5',
    borderWidth: 1,
    borderColor: 'rgba(219,112,147,0.15)',
    justifyContent: 'center',
  },
  genderTagText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#C7254E',
  },
  ageTag: {
    minHeight: 24,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.functional.infoLight,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.06)',
    justifyContent: 'center',
  },
  ageTagText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.functional.info,
  },
  depositTag: {
    minHeight: 24,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.functional.successLight,
    borderWidth: 1,
    borderColor: 'rgba(61, 139, 94, 0.1)',
    justifyContent: 'center',
  },
  depositTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.special.deposit,
  },
  urgencyTag: {
    minHeight: 24,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
    justifyContent: 'center',
  },
  urgencyTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.text.white,
    letterSpacing: 0.1,
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
  participantColumn: {
    gap: 3,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantHighlight: {
    fontSize: 13,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  participantProgressBg: {
    width: 60,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.neutral.grey100,
    overflow: 'hidden',
  },
  participantProgressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text.white,
    letterSpacing: 0.1,
  },
});

export default MeetupCard;
