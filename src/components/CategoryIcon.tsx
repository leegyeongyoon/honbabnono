import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Icon } from './Icon';
import { COLORS } from '../styles/colors';
import type { IconName } from './SimpleIcon';

interface CategoryIconProps {
  iconName: IconName;
  size?: number;
  color?: string;
  backgroundColor?: string;
}

const CategoryIcon: React.FC<CategoryIconProps> = ({
  iconName,
  size = 40,
  color = COLORS.primary.main,
  backgroundColor = COLORS.primary.light,
}) => (
  <View
    style={[
      styles.container,
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor,
      },
    ]}
  >
    <Icon name={iconName} size={size * 0.5} color={color} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CategoryIcon;
