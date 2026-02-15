import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SPACING } from '../../styles/spacing';
import SkeletonLoader from './SkeletonLoader';

interface ListItemSkeletonProps {
  size?: number;
}

const ListItemSkeleton: React.FC<ListItemSkeletonProps> = ({
  size = 40,
}) => {
  return (
    <View style={styles.container}>
      <SkeletonLoader variant="circle" height={size} />
      <View style={styles.content}>
        <SkeletonLoader variant="text" width="65%" height={16} />
        <SkeletonLoader
          variant="text"
          width="90%"
          height={12}
          style={styles.subtitleLine}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
  },
  content: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  subtitleLine: {
    marginTop: SPACING.xs,
  },
});

export default ListItemSkeleton;
