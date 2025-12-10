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
  | 'arrow-left'
  | 'edit'
  | 'trash-2'
  | 'image'
  | 'home'
  | 'users'
  | 'calendar'
  | 'send'
  | 'more-vertical'
  | 'x'
  | 'check'
  | 'chevron-up'
  | 'flame'
  | 'soup'
  | 'food-tray'
  | 'fish'
  | 'pizza'
  | 'wine'
  | 'chef'
  | 'party'
  | 'meat'
  | 'pot'
  | 'tray'
  | 'shrimp'
  | 'drumstick'
  | 'glass'
  | 'silverware'
  | 'gift'
  | 'fire'
  | 'concierge-bell'
  | 'wine-glass'
  | 'award'
  | 'birthday-cake'
  | 'drumstick-bite';

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
  'arrow-left': 'M19 12H5M12 19l-7-7 7-7',
  'edit': 'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z',
  'trash-2': 'M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M10 11v6M14 11v6',
  'image': 'M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2zM5 21l5-5L14 20M14 8h.01',
  'home': 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9zM9 22V12h6v10',
  'users': 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  'calendar': 'M3 4a1 1 0 011-1h16a1 1 0 011 1v16a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM8 2v4M16 2v4M3 10h18',
  'send': 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  'more-vertical': 'M12 13a1 1 0 100-2 1 1 0 000 2zM12 6a1 1 0 100-2 1 1 0 000 2zM12 20a1 1 0 100-2 1 1 0 000 2z',
  'x': 'M18 6L6 18M6 6l12 12',
  'check': 'M20 6L9 17l-5-5',
  'chevron-up': 'M18 15l-6-6-6 6',
  'flame': 'M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z',
  'soup': 'M12 21a9 9 0 109-9 9.75 9.75 0 00-9 9zM7 9a2 2 0 012-2h6a2 2 0 012 2v2H7V9zM10 6V4M14 6V4M18 6V4',
  'food-tray': 'M3 13h18M5 17h14a2 2 0 002-2v-2a2 2 0 00-2-2H5a2 2 0 00-2 2v2a2 2 0 002 2zM8 11V7a4 4 0 118 0v4',
  'fish': 'M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6zM12 10a2 2 0 100 4 2 2 0 000-4z',
  'pizza': 'M12 2l8.09 2.31L18 14H6L3.91 4.31 12 2zM12 8a2 2 0 100 4 2 2 0 000-4z',
  'wine': 'M12 8v13M8 8l4-6 4 6-8 0M9 5h6',
  'chef': 'M12 11c1.33 0 4-.47 4-3.5S14.67 4 12 4s-4 .47-4 3.5S10.67 11 12 11zM12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zM12 13c-4 0-8 .5-8 4v4c0 .55.45 1 1 1h14c.55 0 1-.45 1-1v-4c0-3.5-4-4-8-4z',
  'party': 'M5.8 11.9L2 22l10.1-3.8M22 2l-3.8 10.1-4.3-4.3L22 2zM7 8a3 3 0 100-6 3 3 0 000 6zM17 8a3 3 0 100-6 3 3 0 000 6z',
  'meat': 'M7 17h10l4-4V7h-6l-4 4v6zM17 7c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v6l4 4h6v-6l-4-4V7z',
  'pot': 'M4 7h16l-1 10H5L4 7zM6 5h12v2H6V5zM8 3h8v2H8V3z',
  'tray': 'M4 6h16a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2zM6 10h12v4H6v-4z',
  'shrimp': 'M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7zM12 15c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z',
  'drumstick': 'M12.5 2C8.91 2 6 4.91 6 8.5c0 1.19.32 2.3.87 3.26l4.63 4.63c.96.55 2.07.87 3.26.87 3.59 0 6.5-2.91 6.5-6.5S16.09 2 12.5 2zM12.5 15.26c-.87 0-1.67-.25-2.37-.68L6.68 11.13c-.43-.7-.68-1.5-.68-2.37C6 5.46 8.46 3 11.76 3S17.5 5.46 17.5 8.76s-2.46 5.76-5.76 5.76z',
  'glass': 'M5 2v6l7 7 7-7V2H5zM17 7l-5 5-5-5V4h10v3z',
  'silverware': 'M3 2v7c0 1.1.9 2 2 2h2V2M7 2v9M21 15V2v0M21 15l-2-1v-2M21 15l-2 1',
  'gift': 'M20 12v10H4V12M2 7h20v5H2zM12 7V2M8.5 7h7L12 2l-3.5 5z',
  'fire': 'M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z',
  'concierge-bell': 'M3 20h18v2H3v-2zM12 2C6.48 2 2 6.48 2 12v6h20v-6c0-5.52-4.48-10-10-10zM12 4c4.41 0 8 3.59 8 8v4H4v-4c0-4.41 3.59-8 8-8z',
  'wine-glass': 'M5 8l1-6h12l1 6c0 3.31-2.69 6-6 6s-6-2.69-6-6zM12 14v8M8 22h8',
  'award': 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  'birthday-cake': 'M12 6V2M8 6V2M16 6V2M4 10h16v8a2 2 0 01-2 2H6a2 2 0 01-2-2v-8zM7 14h2M15 14h2M11 14h2',
  'drumstick-bite': 'M12.5 2C8.91 2 6 4.91 6 8.5c0 1.19.32 2.3.87 3.26l4.63 4.63c.96.55 2.07.87 3.26.87 3.59 0 6.5-2.91 6.5-6.5S16.09 2 12.5 2zM15.5 9a1.5 1.5 0 100-3 1.5 1.5 0 000 3z'
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
    'search': '⌕',
    'bell': '○',
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
    'arrow-left': '←',
    'edit': '✏️',
    'trash-2': '🗑️',
    'image': '🖼️',
    'home': '🏠',
    'users': '👥',
    'calendar': '📅',
    'send': '✈️',
    'more-vertical': '⋮',
    'x': '✕',
    'check': '✓',
    'chevron-up': '▲',
    'flame': '🔥',
    'soup': '🍲',
    'food-tray': '🍱',
    'fish': '🐟',
    'pizza': '🍕',
    'wine': '🍷',
    'chef': '👨‍🍳',
    'party': '🎉',
    'meat': '🥩',
    'pot': '🍲',
    'tray': '🍱',
    'shrimp': '🍤',
    'drumstick': '🍗',
    'glass': '🍻',
    'silverware': '🍽️',
    'gift': '🎁',
    'fire': '🔥',
    'concierge-bell': '🛎️',
    'wine-glass': '🍷',
    'award': '🏆',
    'birthday-cake': '🎂',
    'drumstick-bite': '🍗'
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