import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SPACING } from '../../styles/spacing';
import SkeletonLoader from './SkeletonLoader';

const ChatListSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      <SkeletonLoader variant="circle" height={48} />
      <View style={styles.content}>
        <SkeletonLoader variant="text" width="60%" height={16} />
        <SkeletonLoader
          variant="text"
          width="80%"
          height={12}
          style={styles.messageLine}
        />
      </View>
      <SkeletonLoader variant="text" width={40} height={10} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  messageLine: {
    marginTop: SPACING.xs,
  },
});

export default ChatListSkeleton;
