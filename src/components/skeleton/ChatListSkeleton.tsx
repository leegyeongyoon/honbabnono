import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SPACING } from '../../styles/spacing';
import SkeletonLoader from './SkeletonLoader';

const ChatListSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      <SkeletonLoader variant="circle" height={52} />
      <View style={styles.content}>
        <SkeletonLoader variant="text" width="60%" height={16} />
        <SkeletonLoader
          variant="text"
          width="80%"
          height={13}
          style={styles.messageLine}
        />
      </View>
      <View style={styles.meta}>
        <SkeletonLoader variant="text" width={36} height={10} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
    paddingHorizontal: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    marginLeft: 14,
  },
  messageLine: {
    marginTop: 6,
  },
  meta: {
    alignItems: 'flex-end',
    paddingTop: 2,
  },
});

export default ChatListSkeleton;
