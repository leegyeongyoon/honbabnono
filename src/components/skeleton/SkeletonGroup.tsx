import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { SPACING } from '../../styles/spacing';
import SkeletonLoader from './SkeletonLoader';

interface SkeletonGroupProps {
  count?: number;
  gap?: number;
  direction?: 'row' | 'column';
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const SkeletonGroup: React.FC<SkeletonGroupProps> = ({
  count = 3,
  gap = SPACING.sm,
  direction = 'column',
  children,
  style,
}) => {
  if (children) {
    return (
      <View style={[styles.container, { flexDirection: direction, gap }, style]}>
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.container, { flexDirection: direction, gap }, style]}>
      {Array.from({ length: count }, (_, index) => (
        <SkeletonLoader key={index} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
  },
});

export default SkeletonGroup;
