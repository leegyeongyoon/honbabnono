import React from 'react';
import { Platform, ViewStyle } from 'react-native';
import { COLORS } from '../styles/colors';
import { SimpleIcon } from './SimpleIcon';

// Re-export IconName from SimpleIcon
export type { IconName } from './SimpleIcon';

interface IconProps {
  name: import('./SimpleIcon').IconName;
  size?: number;
  color?: string;
  style?: ViewStyle;
}

export const Icon: React.FC<IconProps> = ({ 
  name, 
  size = 20, 
  color = COLORS.text.secondary,
  style 
}) => {
  // Web에서는 SVG를 사용할 수 있지만, 지금은 모든 플랫폼에서 SimpleIcon 사용
  return <SimpleIcon name={name} size={size} color={color} style={style} />;
};