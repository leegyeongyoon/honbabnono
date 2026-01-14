import React from 'react';
import { View, Text, ViewStyle } from 'react-native';
import { COLORS } from '../styles/colors';

export type IconName = 
  | 'search'
  | 'bell'
  | 'map-pin'
  | 'map'
  | 'clock'
  | 'star'
  | 'message-circle'
  | 'home'
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
  | 'users'
  | 'calendar'
  | 'send'
  | 'more-vertical'
  | 'x'
  | 'check'
  | 'chevron-up'
  | 'settings'
  | 'plus'
  | 'minus'
  | 'mail'
  | 'phone'
  | 'credit-card'
  | 'dollar-sign'
  | 'smile'
  | 'coffee'
  | 'tag'
  | 'info'
  | 'external-link'
  | 'gift'
  | 'award'
  | 'utensils'
  | 'megaphone'
  | 'mail-open'
  | 'building'
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
  | 'fire'
  | 'concierge-bell'
  | 'wine-glass'
  | 'birthday-cake'
  | 'drumstick-bite'
  | 'flame';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: ViewStyle;
}

// 간단한 텍스트 기반 아이콘 (SF Symbols 스타일 유사)
const iconSymbols: Record<IconName, string> = {
  'search': '◯',
  'bell': '◔',
  'map-pin': '◈',
  'map': '▦',
  'clock': '◷',
  'star': '★',
  'message-circle': '◉',
  'home': '⌂',
  'user': '◉',
  'heart': '♥',
  'filter': '▽',
  'more-horizontal': '•••',
  'chevron-down': '﹀',
  'chevron-right': '›',
  'chevron-left': '‹',
  'arrow-left': '←',
  'edit': '✎',
  'trash-2': '▫',
  'image': '▭',
  'users': '◉◉',
  'calendar': '▦',
  'send': '➤',
  'more-vertical': '⋮',
  'x': '✕',
  'check': '✓',
  'chevron-up': '︿',
  'settings': '◉',
  'plus': '+',
  'minus': '−',
  'mail': '▭',
  'phone': '◐',
  'credit-card': '▬',
  'dollar-sign': '$',
  'smile': '◉',
  'coffee': '◔',
  'tag': '◈',
  'info': 'ⓘ',
  'external-link': '↗',
  'gift': '▢',
  'award': '◈',
  'utensils': '▽',
  'megaphone': '◢',
  'mail-open': '▭',
  'building': '▦',
  'soup': '◔',
  'food-tray': '▦',
  'fish': '◈',
  'pizza': '◐',
  'wine': '◔',
  'chef': '◉',
  'party': '◈',
  'meat': '◔',
  'pot': '◔',
  'tray': '▦',
  'shrimp': '◈',
  'drumstick': '◔',
  'glass': '◔',
  'silverware': '▽',
  'fire': '△',
  'concierge-bell': '◔',
  'wine-glass': '◔',
  'birthday-cake': '▦',
  'drumstick-bite': '◔',
  'flame': '△'
};

const SimpleIcon: React.FC<IconProps> = ({ 
  name, 
  size = 24, 
  color = COLORS.text.secondary,
  style 
}) => {
  const symbol = iconSymbols[name] || '?';
  
  // 특별한 아이콘 처리
  if (name === 'home') {
    return (
      <View style={[{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }, style]}>
        <View style={{
          width: size * 0.7,
          height: size * 0.6,
          borderWidth: 2,
          borderColor: color,
          borderTopLeftRadius: size * 0.3,
          borderTopRightRadius: size * 0.3,
        }}>
          <View style={{
            position: 'absolute',
            bottom: 0,
            left: '30%',
            width: '40%',
            height: '40%',
            borderWidth: 1.5,
            borderColor: color,
          }} />
        </View>
      </View>
    );
  }
  
  if (name === 'search') {
    return (
      <View style={[{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }, style]}>
        <View style={{
          width: size * 0.6,
          height: size * 0.6,
          borderWidth: 2,
          borderColor: color,
          borderRadius: size * 0.3,
        }} />
        <View style={{
          position: 'absolute',
          bottom: size * 0.15,
          right: size * 0.15,
          width: size * 0.3,
          height: 2,
          backgroundColor: color,
          transform: [{ rotate: '45deg' }],
        }} />
      </View>
    );
  }
  
  if (name === 'message-circle') {
    return (
      <View style={[{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }, style]}>
        <View style={{
          width: size * 0.7,
          height: size * 0.6,
          borderWidth: 2,
          borderColor: color,
          borderRadius: size * 0.3,
        }}>
          <View style={{
            position: 'absolute',
            bottom: -size * 0.1,
            left: size * 0.1,
            width: 0,
            height: 0,
            borderLeftWidth: size * 0.15,
            borderRightWidth: 0,
            borderBottomWidth: size * 0.15,
            borderLeftColor: 'transparent',
            borderBottomColor: color,
          }} />
        </View>
      </View>
    );
  }
  
  if (name === 'user') {
    return (
      <View style={[{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }, style]}>
        <View style={{
          width: size * 0.35,
          height: size * 0.35,
          borderWidth: 2,
          borderColor: color,
          borderRadius: size * 0.175,
          marginBottom: size * 0.1,
        }} />
        <View style={{
          width: size * 0.6,
          height: size * 0.25,
          borderWidth: 2,
          borderColor: color,
          borderTopLeftRadius: size * 0.3,
          borderTopRightRadius: size * 0.3,
          borderBottomWidth: 0,
        }} />
      </View>
    );
  }
  
  // 기본 텍스트 아이콘
  return (
    <View style={[{
      width: size,
      height: size,
      alignItems: 'center',
      justifyContent: 'center',
    }, style]}>
      <Text style={{ 
        fontSize: size * 0.8, 
        color,
        fontWeight: '600',
      }}>
        {symbol}
      </Text>
    </View>
  );
};

export { SimpleIcon };
export type { IconProps };