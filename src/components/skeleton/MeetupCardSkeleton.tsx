import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS, SHADOWS, CARD_STYLE } from '../../styles/colors';
import { SPACING, BORDER_RADIUS } from '../../styles/spacing';
import SkeletonLoader from './SkeletonLoader';

interface MeetupCardSkeletonProps {
  variant?: 'list' | 'grid';
}

const MeetupCardSkeleton: React.FC<MeetupCardSkeletonProps> = ({ variant = 'list' }) => {
  if (variant === 'grid') {
    return (
      <View style={gridStyles.container}>
        <SkeletonLoader
          variant="rectangle"
          width="100%"
          height={120}
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

  return (
    <View style={styles.container}>
      <SkeletonLoader
        variant="rectangle"
        width={60}
        height={60}
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
