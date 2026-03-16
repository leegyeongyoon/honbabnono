import React from 'react';
import { View, Text, StyleSheet, Image, Platform } from 'react-native';
import { COLORS } from '../../styles/colors';
import { Icon } from '../Icon';
import { getAvatarColor, getInitials } from '../../utils/avatarColor';
import type { ParticipantVariant } from './types';
import { getParticipantStatus } from './types';

interface ParticipantIndicatorProps {
  current: number;
  max: number;
  variant: ParticipantVariant;
  avatars?: Array<{ name: string; profileImage?: string }>;
  /** Show status badge (closed/closing soon) next to indicator */
  showStatusBadge?: boolean;
}

// ─── Status Badge (마감임박/마감) ────────────────────────────
const ParticipantStatusBadge: React.FC<{ current: number; max: number }> = ({ current, max }) => {
  const status = getParticipantStatus(current, max);
  if (status.type === 'open') return null;

  return (
    <View style={[statusBadgeStyles.badge, { backgroundColor: status.bgColor }]}>
      <Text style={[statusBadgeStyles.text, { color: status.color }]}>
        {status.label}
      </Text>
    </View>
  );
};

// ─── Bar variant ───────────────────────────────────────────
const BarIndicator: React.FC<{ current: number; max: number; showStatusBadge?: boolean }> = ({ current, max, showStatusBadge }) => {
  const ratio = max > 0 ? current / max : 0;
  const fillColor =
    current >= max
      ? COLORS.functional.error
      : ratio > 0.8
        ? COLORS.functional.warning
        : COLORS.primary.accent;

  return (
    <View style={barStyles.wrapper}>
      <View style={barStyles.row}>
        <Icon name="users" size={13} color={COLORS.neutral.grey500} />
        <Text style={barStyles.text}> {current}/{max}명</Text>
        {showStatusBadge && <ParticipantStatusBadge current={current} max={max} />}
      </View>
      <View style={barStyles.track}>
        <View
          style={[
            barStyles.fill,
            {
              width: `${Math.min(ratio * 100, 100)}%` as unknown as number,
              backgroundColor: fillColor,
            },
          ]}
        />
      </View>
    </View>
  );
};

// ─── Text variant ──────────────────────────────────────────
const TextIndicator: React.FC<{ current: number; max: number }> = ({ current, max }) => (
  <View style={textStyles.row}>
    <Icon name="users" size={13} color={COLORS.neutral.grey500} />
    <Text style={textStyles.label}> {current}/{max}명</Text>
  </View>
);

// ─── Avatars variant ───────────────────────────────────────
const AvatarStack: React.FC<{
  current: number;
  avatars: Array<{ name: string; profileImage?: string }>;
  avatarSize?: number;
  maxShow?: number;
}> = ({ current, avatars, avatarSize = 20, maxShow = 3 }) => {
  const showCount = Math.min(avatars.length, maxShow);
  const remaining = current - showCount;

  if (current === 0) return null;

  return (
    <View style={avatarStyles.row}>
      {avatars.slice(0, showCount).map((p, i) => (
        <View
          key={i}
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
            marginLeft: i > 0 ? -avatarSize * 0.3 : 0,
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
            <View
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: getAvatarColor(p.name),
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: avatarSize * 0.4, fontWeight: '600', color: COLORS.text.white }}>
                {getInitials(p.name)}
              </Text>
            </View>
          )}
        </View>
      ))}
      {remaining > 0 && (
        <View
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
            marginLeft: -avatarSize * 0.3,
            borderWidth: 1.5,
            borderColor: COLORS.neutral.white,
            backgroundColor: COLORS.neutral.grey200,
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 0,
          }}
        >
          <Text style={{ fontSize: avatarSize * 0.35, fontWeight: '600', color: COLORS.text.secondary }}>
            +{remaining}
          </Text>
        </View>
      )}
    </View>
  );
};

// ─── Main Component ────────────────────────────────────────
const ParticipantIndicator: React.FC<ParticipantIndicatorProps> = ({
  current,
  max,
  variant,
  avatars = [],
  showStatusBadge = true,
}) => {
  switch (variant) {
    case 'bar':
      return <BarIndicator current={current} max={max} showStatusBadge={showStatusBadge} />;
    case 'text':
      return <TextIndicator current={current} max={max} />;
    case 'avatars':
      return <AvatarStack current={current} avatars={avatars} />;
    default:
      return <TextIndicator current={current} max={max} />;
  }
};

// ─── Styles ────────────────────────────────────────────────
const statusBadgeStyles = StyleSheet.create({
  badge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
  },
});

const barStyles = StyleSheet.create({
  wrapper: { gap: 3 },
  row: { flexDirection: 'row', alignItems: 'center' },
  text: { fontSize: 13, color: COLORS.text.secondary, fontWeight: '600' },
  track: {
    width: 60,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.neutral.grey100,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 1.5 },
});

const textStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { fontSize: 13, color: COLORS.text.secondary, fontWeight: '600' },
});

const avatarStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});

export default ParticipantIndicator;
