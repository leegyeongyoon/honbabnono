import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../styles/colors';

interface ChatBadgeProps {
  count: number;
  size?: 'small' | 'medium';
}

const ChatBadge: React.FC<ChatBadgeProps> = ({ count, size = 'small' }) => {
  console.log('🔍 ChatBadge 렌더링 - count:', count, 'size:', size);
  
  if (count <= 0) {
    console.log('🔍 ChatBadge count <= 0, returning null');
    return null;
  }

  const displayCount = count > 99 ? '99+' : count.toString();
  const isLarge = size === 'medium';
  
  console.log('🔍 ChatBadge 표시 - displayCount:', displayCount);

  return (
    <View style={[
      styles.badge,
      isLarge ? styles.badgeMedium : styles.badgeSmall
    ]}>
      <Text style={[
        styles.badgeText,
        isLarge ? styles.badgeTextMedium : styles.badgeTextSmall
      ]}>
        {displayCount}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    backgroundColor: COLORS.functional.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    position: 'absolute',
    top: -6,
    right: -6,
    borderWidth: 1,
    borderColor: COLORS.neutral.white,
  },
  badgeSmall: {
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    top: -5,
    right: -5,
  },
  badgeMedium: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    top: -7,
    right: -7,
  },
  badgeText: {
    color: COLORS.text.white,
    fontWeight: '700',
    textAlign: 'center',
  },
  badgeTextSmall: {
    fontSize: 9,
    lineHeight: 10,
  },
  badgeTextMedium: {
    fontSize: 10,
    lineHeight: 12,
  },
});

export default ChatBadge;