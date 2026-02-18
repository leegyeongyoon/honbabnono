import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { COLORS, SHADOWS, CTA_STYLE } from '../styles/colors';
import { TYPOGRAPHY } from '../styles/typography';
import { SPACING, BORDER_RADIUS } from '../styles/spacing';
import { Icon } from './Icon';
import type { IconName } from './SimpleIcon';

const VARIANT_DEFAULTS: Record<string, { icon: IconName; title: string }> = {
  'no-data': { icon: 'mail-open', title: '데이터가 없습니다' },
  'no-results': { icon: 'search', title: '검색 결과가 없습니다' },
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
  iconSize = 64,
  secondaryActionLabel,
  onSecondaryAction,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  const defaults = variant ? VARIANT_DEFAULTS[variant] : undefined;
  const resolvedIcon = icon ?? defaults?.icon ?? 'mail-open';
  const resolvedTitle = title ?? defaults?.title ?? '';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const renderIcon = () => {
    if (isIconName(resolvedIcon)) {
      return (
        <View style={[styles.iconContainer, compact && styles.iconContainerCompact]}>
          <Icon
            name={resolvedIcon as IconName}
            size={compact ? 24 : 36}
            color={COLORS.neutral.grey400}
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
    paddingVertical: SPACING.xxxl,
    paddingHorizontal: SPACING.xl,
  },
  compact: {
    paddingVertical: SPACING.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.neutral.light,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconContainerCompact: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: 14,
  },
  emojiIcon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 260,
    letterSpacing: 0,
  },
  actionButton: {
    marginTop: SPACING.xl,
    paddingHorizontal: 24,
    paddingVertical: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary.accent,
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.cta,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.white,
    letterSpacing: -0.05,
  },
  secondaryButton: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    borderRadius: BORDER_RADIUS.md,
  },
  secondaryText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text.secondary,
    letterSpacing: 0,
  },
});

export default EmptyState;
