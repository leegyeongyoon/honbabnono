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
                borderRadius: BORDER_RADIUS.md,
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
          {/* 2행: 날짜/시간 + 위치 */}
          <View style={compactStyles.metaRow}>
            <Icon name="calendar" size={11} color={COLORS.neutral.grey400} />
            <Text style={compactStyles.metaText} numberOfLines={1}>
              {formatMeetupDateTime(meetup.date, meetup.time)}
            </Text>
            <Text style={compactStyles.metaDot}> · </Text>
            <Icon name="map-pin" size={11} color={COLORS.neutral.grey400} />
            <Text style={compactStyles.metaText} numberOfLines={1}>
              {meetup.location || '위치 미정'}
            </Text>
          </View>
          {/* 3행: 호스트 + 가격대 + 보증금 */}
          <View style={compactStyles.metaRow}>
            {meetup.hostName ? (
              <Text style={compactStyles.hostText}>{meetup.hostName}</Text>
            ) : (
              <Text style={compactStyles.hostText}>{meetup.category}</Text>
            )}
            {meetup.priceRange ? (
              <>
                <Text style={compactStyles.metaDot}> · </Text>
                <Text style={compactStyles.priceText}>{meetup.priceRange}</Text>
              </>
            ) : null}
            {meetup.promiseDepositAmount ? (
              <>
                <Text style={compactStyles.metaDot}> · </Text>
                <Text style={compactStyles.depositText}>보증금 {meetup.promiseDepositAmount.toLocaleString()}원</Text>
              </>
            ) : null}
          </View>
          {/* 4행: 인원수 + 소형 프로그레스바 */}
          <View style={compactStyles.participantRow}>
            <Icon name="users" size={11} color={COLORS.neutral.grey500} />
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
                          : COLORS.primary.accent,
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
            backgroundColor: isHovered ? COLORS.neutral.grey50 : COLORS.neutral.white,
            cursor: 'pointer',
            transition: 'background-color 120ms ease',
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

  // ─── Grid Variant ───────────────────────────────────────────
  if (variant === 'grid') {
    const gridContent = (
      <>
        {/* 이미지 */}
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
                borderTopLeftRadius: BORDER_RADIUS.lg,
                borderTopRightRadius: BORDER_RADIUS.lg,
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
                borderTopLeftRadius: BORDER_RADIUS.lg,
                borderTopRightRadius: BORDER_RADIUS.lg,
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
          {/* 하단 그라데이션 오버레이 */}
          {Platform.OS === 'web' && (
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '40%',
              background: 'linear-gradient(transparent, rgba(17,17,17,0.25))',
              pointerEvents: 'none' as const,
            }} />
          )}
          {/* 상태 뱃지 오버레이 */}
          {statusConfig && (
            <View style={[gridStyles.statusOverlay, { backgroundColor: statusConfig.bg }]}>
              <Text style={gridStyles.statusText}>{statusConfig.label}</Text>
            </View>
          )}
          {/* 긴급 뱃지 */}
          {urgencyInfo && (
            <View style={[gridStyles.urgencyOverlay, { backgroundColor: urgencyInfo.color }]}>
              <Text style={gridStyles.urgencyText}>{urgencyInfo.label}</Text>
            </View>
          )}
          {/* 보증금 태그 (이미지 위) */}
          {meetup.promiseDepositAmount ? (
            <View style={gridStyles.depositOverlay}>
              <Text style={gridStyles.depositText}>보증금 {meetup.promiseDepositAmount.toLocaleString()}원</Text>
            </View>
          ) : null}
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

          {/* 호스트 정보 */}
          {meetup.hostName && (
            <View style={gridStyles.hostRow}>
              {meetup.hostImage ? (
                Platform.OS === 'web' ? (
                  <img
                    src={meetup.hostImage}
                    style={{ width: 16, height: 16, borderRadius: 8, objectFit: 'cover' }}
                    alt={meetup.hostName}
                  />
                ) : (
                  <Image source={{ uri: meetup.hostImage }} style={{ width: 16, height: 16, borderRadius: 8 }} />
                )
              ) : (
                <View style={{
                  width: 16, height: 16, borderRadius: 8,
                  backgroundColor: getAvatarColor(meetup.hostName),
                  justifyContent: 'center', alignItems: 'center',
                }}>
                  <Text style={{ fontSize: 7, fontWeight: '600', color: COLORS.text.white }}>
                    {getInitials(meetup.hostName)}
                  </Text>
                </View>
              )}
              <Text style={gridStyles.hostName} numberOfLines={1}>{meetup.hostName}</Text>
              {meetup.hostRating != null && (
                <>
                  <Icon name="star" size={10} color={COLORS.functional.warning} solid />
                  <Text style={gridStyles.hostRating}>{meetup.hostRating.toFixed(1)}</Text>
                </>
              )}
            </View>
          )}

          {/* 날짜 + 위치 */}
          <View style={gridStyles.metaRow}>
            <Icon name="calendar" size={11} color={COLORS.neutral.grey400} />
            <Text style={gridStyles.metaText}>
              {' '}{formatMeetupDateTime(meetup.date, meetup.time)}
            </Text>
          </View>

          <View style={gridStyles.metaRow}>
            <Icon name="map-pin" size={11} color={COLORS.neutral.grey400} />
            <Text style={gridStyles.metaText} numberOfLines={1}>
              {' '}{locationText}
            </Text>
          </View>

          {/* 참가자 프로그레스바 */}
          <View style={gridStyles.participantSection}>
            <View style={gridStyles.participantRow}>
              <Icon name="users" size={11} color={COLORS.neutral.grey500} />
              <Text style={gridStyles.participantText}>{' '}{participantText}</Text>
            </View>
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
                          : COLORS.primary.accent,
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
            borderRadius: BORDER_RADIUS.lg,
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

  if (Platform.OS === 'web') {
    return (
      <div
        onClick={() => onPress(meetup)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'scale(0.99)';
          e.currentTarget.style.boxShadow = CSS_SHADOWS.small;
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = isHovered ? 'translateY(-1px)' : 'none';
          e.currentTarget.style.boxShadow = isHovered ? CSS_SHADOWS.medium : CSS_SHADOWS.card;
        }}
        role="article"
        aria-label={`${meetup.title}, ${meetup.category}, ${participantText}`}
        style={{
          backgroundColor: COLORS.neutral.white,
          borderRadius: BORDER_RADIUS.lg,
          padding: SPACING.card.padding,
          marginBottom: SPACING.md,
          display: 'flex',
          flexDirection: 'row' as const,
          alignItems: 'flex-start',
          gap: 14,
          boxShadow: isHovered ? CSS_SHADOWS.medium : CSS_SHADOWS.card,
          transform: isHovered ? 'translateY(-1px)' : 'none',
          transition: 'transform 200ms ease, box-shadow 200ms ease',
          cursor: 'pointer',
          border: `1px solid ${CARD_STYLE.borderColor}`,
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
    paddingVertical: 12,
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
    width: 68,
    height: 68,
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
    borderRadius: BORDER_RADIUS.xs,
  },
  statusOverlayText: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.text.white,
    letterSpacing: 0.2,
  },
  textArea: {
    flex: 1,
    gap: 3,
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
    borderRadius: BORDER_RADIUS.xs,
    flexShrink: 0,
  },
  urgencyText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.text.white,
    letterSpacing: 0.1,
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
    letterSpacing: 0,
  },
  metaDot: {
    fontSize: 12,
    color: COLORS.neutral.grey300,
  },
  hostText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  priceText: {
    fontSize: 12,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  depositText: {
    fontSize: 11,
    color: COLORS.functional.success,
    fontWeight: '600',
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  participantText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  progressBg: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.neutral.grey100,
    overflow: 'hidden',
    marginLeft: 6,
    maxWidth: 72,
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
});

// ─── Grid Variant Styles ─────────────────────────────────────
const gridStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    borderWidth: CARD_STYLE.borderWidth,
    borderColor: CARD_STYLE.borderColor,
    ...SHADOWS.small,
  },
  imageContainer: {
    width: '100%',
    height: 170,
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
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.xs,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.text.white,
    letterSpacing: 0.2,
  },
  urgencyOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.xs,
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.text.white,
    letterSpacing: 0.1,
  },
  depositOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.xs,
    backgroundColor: 'rgba(61,139,94,0.9)',
  },
  depositText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.text.white,
    letterSpacing: 0,
  },
  content: {
    padding: 14,
    gap: 5,
  },
  categoryTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.neutral.light,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
  },
  categoryTagText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.text.secondary,
    letterSpacing: 0.1,
  },
  title: {
    ...TYPOGRAPHY.card.gridTitle,
    marginTop: 2,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hostName: {
    fontSize: 11,
    color: COLORS.text.tertiary,
    fontWeight: '500',
    flex: 1,
  },
  hostRating: {
    fontSize: 11,
    color: COLORS.text.secondary,
    fontWeight: '600',
    marginLeft: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 11,
    color: COLORS.text.tertiary,
    letterSpacing: 0,
  },
  participantSection: {
    marginTop: 4,
    gap: 4,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  participantText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  progressBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.neutral.grey100,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});

// ─── List Variant Styles ─────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.card.padding,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    borderWidth: CARD_STYLE.borderWidth,
    borderColor: CARD_STYLE.borderColor,
    ...SHADOWS.small,
  },
  imageContainer: {
    width: 96,
    height: 96,
    borderRadius: BORDER_RADIUS.lg,
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
    borderRadius: BORDER_RADIUS.lg,
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
