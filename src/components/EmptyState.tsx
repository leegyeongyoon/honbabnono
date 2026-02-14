import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../styles/colors';
import { TYPOGRAPHY } from '../styles/typography';
import { SPACING, BORDER_RADIUS } from '../styles/spacing';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '\u{1F4ED}',
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
}) => {
  return (
    <View style={[styles.container, compact && styles.compact]}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.actionButton} onPress={onAction} activeOpacity={0.7}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
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
  icon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  title: {
    ...TYPOGRAPHY.heading.h4,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  description: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  actionButton: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primary.main,
    borderRadius: BORDER_RADIUS.full,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.white,
  },
});

export default EmptyState;
