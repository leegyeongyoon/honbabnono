import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS, SHADOWS, CARD_STYLE } from '../../styles/colors';
import { SPACING, BORDER_RADIUS } from '../../styles/spacing';
import SkeletonLoader from './SkeletonLoader';

interface MeetupCardSkeletonProps {
  variant?: 'list' | 'grid' | 'compact';
}

const MeetupCardSkeleton: React.FC<MeetupCardSkeletonProps> = ({ variant = 'list' }) => {
  if (variant === 'grid') {
    return (
      <View style={gridStyles.container}>
        <SkeletonLoader
          variant="rectangle"
          width="100%"
          height={140}
          borderRadius={0}
        />
        <View style={gridStyles.content}>
          <SkeletonLoader
            variant="rectangle"
            width={48}
            height={16}
            borderRadius={6}
          />
          <SkeletonLoader variant="text" width="85%" height={14} />
          <SkeletonLoader variant="text" width="60%" height={12} />
          <SkeletonLoader variant="text" width="50%" height={12} />
          <SkeletonLoader variant="text" width="70%" height={12} />
        </View>
      </View>
    );
  }

  if (variant === 'compact') {
    return (
      <View style={compactStyles.container}>
        <SkeletonLoader
          variant="rectangle"
          width={80}
          height={80}
          borderRadius={BORDER_RADIUS.md}
        />
        <View style={compactStyles.content}>
          <SkeletonLoader variant="text" width="75%" height={14} />
          <SkeletonLoader
            variant="text"
            width="55%"
            height={12}
            style={compactStyles.line}
          />
          <SkeletonLoader
            variant="text"
            width="40%"
            height={12}
            style={compactStyles.line}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SkeletonLoader
        variant="rectangle"
        width={100}
        height={100}
        borderRadius={BORDER_RADIUS.md}
      />
      <View style={styles.content}>
        <SkeletonLoader variant="text" width="70%" height={16} />
        <SkeletonLoader
          variant="text"
          width="50%"
          height={12}
          style={styles.hostLine}
        />
        <View style={styles.tagRow}>
          <SkeletonLoader
            variant="rectangle"
            width={48}
            height={20}
            borderRadius={BORDER_RADIUS.sm}
          />
          <SkeletonLoader
            variant="rectangle"
            width={56}
            height={20}
            borderRadius={BORDER_RADIUS.sm}
          />
        </View>
        <SkeletonLoader
          variant="text"
          width="40%"
          height={12}
          style={styles.metaLine}
        />
      </View>
    </View>
  );
};

const gridStyles = StyleSheet.create({
  container: {
    width: 240,
    backgroundColor: COLORS.neutral.white,
    borderRadius: CARD_STYLE.borderRadius,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  content: {
    padding: 12,
    gap: 6,
  },
});

const compactStyles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    ...SHADOWS.small,
  },
  content: {
    flex: 1,
    marginLeft: SPACING.md,
    justifyContent: 'center',
  },
  line: {
    marginTop: SPACING.xs,
  },
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    flexDirection: 'row',
    ...SHADOWS.small,
  },
  content: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  hostLine: {
    marginTop: SPACING.xs,
  },
  tagRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  metaLine: {
    marginTop: SPACING.xs,
  },
});

export default MeetupCardSkeleton;
