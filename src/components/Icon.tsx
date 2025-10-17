import React from 'react';
import { View, ViewStyle, Text, Platform } from 'react-native';
import { COLORS } from '../styles/colors';

export type IconName = 
  | 'search'
  | 'bell'
  | 'map-pin'
  | 'clock'
  | 'star'
  | 'message-circle'
  | 'utensils'
  | 'megaphone'
  | 'mail-open'
  | 'plus'
  | 'settings'
  | 'user'
  | 'heart'
  | 'filter'
  | 'more-horizontal'
  | 'chevron-down'
  | 'chevron-right'
  | 'chevron-left'
  | 'home'
  | 'users';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: ViewStyle;
}

// SVG paths for each icon (simplified Feather icons)
const iconPaths = {
  'search': 'M21 21l-4.35-4.35M19 11a8 8 0 11-16 0 8 8 0 0116 0z',
  'bell': 'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0',
  'map-pin': 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 13a3 3 0 100-6 3 3 0 000 6z',
  'clock': 'M12 2a10 10 0 1010 10A10 10 0 0012 2zM12 6v6l4 2',
  'star': 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  'message-circle': 'M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z',
  'utensils': 'M3 2v7c0 1.1.9 2 2 2h2V2M7 2v9M21 15V2v0M21 15l-2-1v-2M21 15l-2 1',
  'megaphone': 'M3 11l18-5v2L3 13v-2zM11.6 16.8a3 3 0 11-5.8-1.6',
  'mail-open': 'M21.2 8.4c.2.2.3.4.3.6v12a2 2 0 01-2 2H4.5a2 2 0 01-2-2V9c0-.2.1-.4.3-.6l8.5-6c.7-.5 1.7-.5 2.4 0l7.5 6zM22 9L12 17 2 9',
  'plus': 'M12 5v14M5 12h14',
  'settings': 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z',
  'user': 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z',
  'heart': 'M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z',
  'filter': 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
  'more-horizontal': 'M12 13a1 1 0 100-2 1 1 0 000 2zM19 13a1 1 0 100-2 1 1 0 000 2zM5 13a1 1 0 100-2 1 1 0 000 2z',
  'chevron-down': 'M6 9l6 6 6-6',
  'chevron-right': 'M9 18l6-6-6-6',
  'chevron-left': 'M15 18l-6-6 6-6',
  'home': 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9zM9 22V12h6v10',
  'users': 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75'
};

// Simple SVG component for web
const SVGIcon: React.FC<{ path: string; size: number; color: string; style?: ViewStyle }> = ({ 
  path, 
  size, 
  color,
  style 
}) => {
  if (Platform.OS === 'web') {
    return (
      <div style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style as any
      }}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={path} />
        </svg>
      </div>
    );
  }
  
  // For React Native, use a simple text fallback or you could implement react-native-svg
  const iconEmojis = {
    'search': '🔍',
    'bell': '🔔',
    'map-pin': '📍',
    'clock': '🕐',
    'star': '⭐',
    'message-circle': '💬',
    'utensils': '🍽️',
    'megaphone': '📢',
    'mail-open': '📭',
    'plus': '➕',
    'settings': '⚙️',
    'user': '👤',
    'heart': '❤️',
    'filter': '🔽',
    'more-horizontal': '⋯',
    'chevron-down': '▼',
    'chevron-right': '▶',
    'chevron-left': '◀',
    'home': '🏠',
    'users': '👥'
  };
  
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Text style={{ fontSize: size * 0.7, color }}>
        {iconEmojis[path as keyof typeof iconEmojis] || '?'}
      </Text>
    </View>
  );
};

export const Icon: React.FC<IconProps> = ({ 
  name, 
  size = 20, 
  color = COLORS.text.secondary,
  style 
}) => {
  const path = iconPaths[name];
  
  if (!path) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }

  return <SVGIcon path={path} size={size} color={color} style={style} />;
};