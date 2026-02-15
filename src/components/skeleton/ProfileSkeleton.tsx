import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SPACING } from '../../styles/spacing';
import SkeletonLoader from './SkeletonLoader';

const ProfileSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      <SkeletonLoader variant="circle" height={80} />
      <SkeletonLoader
        variant="text"
        width={120}
        height={18}
        style={styles.nameLine}
      />
      <SkeletonLoader
        variant="text"
        width={160}
        height={14}
        style={styles.emailLine}
      />
      <View style={styles.statsRow}>
        <SkeletonLoader variant="rectangle" width={60} height={40} />
        <SkeletonLoader variant="rectangle" width={60} height={40} />
        <SkeletonLoader variant="rectangle" width={60} height={40} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  nameLine: {
    marginTop: SPACING.lg,
  },
  emailLine: {
    marginTop: SPACING.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginTop: SPACING.lg,
  },
});

export default ProfileSkeleton;
