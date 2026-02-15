import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../styles/colors';
import { TYPOGRAPHY } from '../styles/typography';
import { SPACING, BORDER_RADIUS } from '../styles/spacing';
import { Icon } from './Icon';
import type { IconName } from './SimpleIcon';

const VARIANT_DEFAULTS: Record<string, { icon: IconName; title: string }> = {
  'no-data': { icon: 'mail-open', title: '아직 데이터가 없어요' },
  'no-results': { icon: 'search', title: '검색 결과가 없어요' },
  'error': { icon: 'alert-triangle', title: '문제가 발생했습니다' },
  'offline': { icon: 'smartphone', title: '인터넷 연결을 확인해주세요' },
};

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
  variant?: 'no-data' | 'no-results' | 'error' | 'offline';
  illustration?: 'emoji' | 'character';
  iconSize?: number;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

const isIconName = (icon: string): icon is IconName => {
  return !icon.match(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27FF}\u{FE00}-\u{FEFF}]/u);
};

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
  variant,
  iconSize = 48,
  secondaryActionLabel,
  onSecondaryAction,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const defaults = variant ? VARIANT_DEFAULTS[variant] : undefined;
  const resolvedIcon = icon ?? defaults?.icon ?? 'mail-open';
  const resolvedTitle = title ?? defaults?.title ?? '';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const renderIcon = () => {
    if (isIconName(resolvedIcon)) {
      return (
        <View style={[styles.iconCircle, compact && styles.iconCircleCompact]}>
          <Icon
            name={resolvedIcon as IconName}
            size={compact ? 28 : 36}
            color={COLORS.primary.main}
          />
        </View>
      );
    }
    return <Text style={[styles.emojiIcon, { fontSize: iconSize }]}>{resolvedIcon}</Text>;
  };

  return (
    <Animated.View
      style={[
        styles.container,
        compact && styles.compact,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {renderIcon()}
      <Text style={styles.title}>{resolvedTitle}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onAction}
          activeOpacity={0.7}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
      {secondaryActionLabel && onSecondaryAction && (
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={onSecondaryAction}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryText}>{secondaryActionLabel}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
  },
  compact: {
    paddingVertical: SPACING.lg,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  iconCircleCompact: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  emojiIcon: {
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  description: {
    fontSize: 15,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  actionButton: {
    marginTop: SPACING.md,
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: COLORS.primary.main,
    borderRadius: 12,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text.white,
  },
  secondaryButton: {
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.neutral.grey100,
    borderRadius: BORDER_RADIUS.full,
  },
  secondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
});

export default EmptyState;
