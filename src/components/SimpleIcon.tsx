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
  | 'flame'
  | 'navigation'
  | 'list';

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
  'flame': '△',
  'navigation': '↗',
  'list': '≡'
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

  // 벨 아이콘 (알림)
  if (name === 'bell') {
    return (
      <View style={[{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }, style]}>
        {/* 벨 몸통 */}
        <View style={{
          width: size * 0.6,
          height: size * 0.5,
          borderWidth: 2,
          borderColor: color,
          borderTopLeftRadius: size * 0.3,
          borderTopRightRadius: size * 0.3,
          borderBottomWidth: 0,
        }} />
        {/* 벨 하단 */}
        <View style={{
          width: size * 0.7,
          height: size * 0.1,
          backgroundColor: color,
          borderRadius: size * 0.05,
        }} />
        {/* 벨 꼭대기 */}
        <View style={{
          position: 'absolute',
          top: size * 0.08,
          width: size * 0.12,
          height: size * 0.12,
          backgroundColor: color,
          borderRadius: size * 0.06,
        }} />
        {/* 딸랑이 */}
        <View style={{
          position: 'absolute',
          bottom: size * 0.05,
          width: size * 0.15,
          height: size * 0.15,
          backgroundColor: color,
          borderRadius: size * 0.075,
        }} />
      </View>
    );
  }

  // 설정 아이콘 (톱니바퀴)
  if (name === 'settings') {
    return (
      <View style={[{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }, style]}>
        {/* 중앙 원 */}
        <View style={{
          width: size * 0.35,
          height: size * 0.35,
          borderWidth: 2,
          borderColor: color,
          borderRadius: size * 0.175,
        }} />
        {/* 상단 톱니 */}
        <View style={{
          position: 'absolute',
          top: size * 0.08,
          width: size * 0.15,
          height: size * 0.2,
          backgroundColor: color,
          borderRadius: size * 0.04,
        }} />
        {/* 하단 톱니 */}
        <View style={{
          position: 'absolute',
          bottom: size * 0.08,
          width: size * 0.15,
          height: size * 0.2,
          backgroundColor: color,
          borderRadius: size * 0.04,
        }} />
        {/* 좌측 톱니 */}
        <View style={{
          position: 'absolute',
          left: size * 0.08,
          width: size * 0.2,
          height: size * 0.15,
          backgroundColor: color,
          borderRadius: size * 0.04,
        }} />
        {/* 우측 톱니 */}
        <View style={{
          position: 'absolute',
          right: size * 0.08,
          width: size * 0.2,
          height: size * 0.15,
          backgroundColor: color,
          borderRadius: size * 0.04,
        }} />
      </View>
    );
  }

  // 필터 아이콘
  if (name === 'filter') {
    return (
      <View style={[{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }, style]}>
        <View style={{
          width: size * 0.7,
          height: 2,
          backgroundColor: color,
          marginBottom: size * 0.12,
        }} />
        <View style={{
          width: size * 0.5,
          height: 2,
          backgroundColor: color,
          marginBottom: size * 0.12,
        }} />
        <View style={{
          width: size * 0.3,
          height: 2,
          backgroundColor: color,
        }} />
      </View>
    );
  }

  // chevron-right
  if (name === 'chevron-right') {
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
          borderRightWidth: 2,
          borderTopWidth: 2,
          borderColor: color,
          transform: [{ rotate: '45deg' }],
        }} />
      </View>
    );
  }

  // chevron-left
  if (name === 'chevron-left') {
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
          borderLeftWidth: 2,
          borderBottomWidth: 2,
          borderColor: color,
          transform: [{ rotate: '45deg' }],
        }} />
      </View>
    );
  }

  // chevron-down
  if (name === 'chevron-down') {
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
          borderRightWidth: 2,
          borderBottomWidth: 2,
          borderColor: color,
          transform: [{ rotate: '45deg' }],
        }} />
      </View>
    );
  }

  // chevron-up
  if (name === 'chevron-up') {
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
          borderLeftWidth: 2,
          borderTopWidth: 2,
          borderColor: color,
          transform: [{ rotate: '45deg' }],
        }} />
      </View>
    );
  }

  // plus 아이콘
  if (name === 'plus') {
    return (
      <View style={[{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }, style]}>
        <View style={{
          width: size * 0.6,
          height: 2.5,
          backgroundColor: color,
        }} />
        <View style={{
          position: 'absolute',
          width: 2.5,
          height: size * 0.6,
          backgroundColor: color,
        }} />
      </View>
    );
  }

  // x (닫기) 아이콘
  if (name === 'x') {
    return (
      <View style={[{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }, style]}>
        <View style={{
          position: 'absolute',
          width: size * 0.6,
          height: 2,
          backgroundColor: color,
          transform: [{ rotate: '45deg' }],
        }} />
        <View style={{
          position: 'absolute',
          width: size * 0.6,
          height: 2,
          backgroundColor: color,
          transform: [{ rotate: '-45deg' }],
        }} />
      </View>
    );
  }

  // map-pin 아이콘
  if (name === 'map-pin') {
    return (
      <View style={[{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }, style]}>
        <View style={{
          width: size * 0.5,
          height: size * 0.5,
          borderWidth: 2,
          borderColor: color,
          borderRadius: size * 0.25,
          marginBottom: -size * 0.1,
        }} />
        <View style={{
          width: 0,
          height: 0,
          borderLeftWidth: size * 0.15,
          borderRightWidth: size * 0.15,
          borderTopWidth: size * 0.25,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: color,
        }} />
      </View>
    );
  }

  // heart 아이콘
  if (name === 'heart') {
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
          fontWeight: '400',
        }}>
          ♥
        </Text>
      </View>
    );
  }

  // star 아이콘
  if (name === 'star') {
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
          fontWeight: '400',
        }}>
          ★
        </Text>
      </View>
    );
  }

  // check 아이콘
  if (name === 'check') {
    return (
      <View style={[{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }, style]}>
        <View style={{
          width: size * 0.3,
          height: size * 0.5,
          borderBottomWidth: 2.5,
          borderRightWidth: 2.5,
          borderColor: color,
          transform: [{ rotate: '45deg' }],
          marginTop: -size * 0.1,
        }} />
      </View>
    );
  }

  // navigation 아이콘
  if (name === 'navigation') {
    return (
      <View style={[{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }, style]}>
        <View style={{
          width: 0,
          height: 0,
          borderLeftWidth: size * 0.2,
          borderRightWidth: size * 0.2,
          borderBottomWidth: size * 0.5,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: color,
          transform: [{ rotate: '45deg' }],
        }} />
      </View>
    );
  }

  // map 아이콘
  if (name === 'map') {
    return (
      <View style={[{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }, style]}>
        <View style={{
          width: size * 0.7,
          height: size * 0.55,
          borderWidth: 2,
          borderColor: color,
          borderRadius: size * 0.05,
        }}>
          <View style={{
            position: 'absolute',
            left: '33%',
            top: 0,
            bottom: 0,
            width: 1.5,
            backgroundColor: color,
          }} />
          <View style={{
            position: 'absolute',
            left: '66%',
            top: 0,
            bottom: 0,
            width: 1.5,
            backgroundColor: color,
          }} />
        </View>
      </View>
    );
  }

  // list 아이콘
  if (name === 'list') {
    return (
      <View style={[{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }, style]}>
        <View style={{
          width: size * 0.65,
          height: 2,
          backgroundColor: color,
          marginBottom: size * 0.15,
        }} />
        <View style={{
          width: size * 0.65,
          height: 2,
          backgroundColor: color,
          marginBottom: size * 0.15,
        }} />
        <View style={{
          width: size * 0.65,
          height: 2,
          backgroundColor: color,
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