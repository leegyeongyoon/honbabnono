import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../styles/colors';
import { TYPOGRAPHY } from '../styles/typography';
import { SPACING, BORDER_RADIUS } from '../styles/spacing';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({
  title = '\uBB38\uC81C\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4',
  description = '\uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694',
  onRetry,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{'\u26A0\uFE0F'}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.7}>
          <Text style={styles.retryText}>{'\uB2E4\uC2DC \uC2DC\uB3C4'}</Text>
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
  icon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  title: {
    ...TYPOGRAPHY.heading.h4,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  description: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.text.primary,
    borderRadius: BORDER_RADIUS.full,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.white,
  },
});

export default ErrorState;
