import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../styles/colors';

interface ChatBadgeProps {
  count: number;
  size?: 'small' | 'medium';
}

const ChatBadge: React.FC<ChatBadgeProps> = ({ count, size = 'small' }) => {
  if (count <= 0) {
    return null;
  }

  const displayCount = count > 99 ? '99+' : count.toString();
  const isLarge = size === 'medium';

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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    position: 'absolute',
    borderWidth: 1,
    borderColor: COLORS.neutral.white,
  },
  badgeSmall: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    top: -5,
    right: -8,
  },
  badgeMedium: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    top: -5,
    right: -10,
  },
  badgeText: {
    color: COLORS.text.white,
    fontWeight: '700',
    textAlign: 'center',
  },
  badgeTextSmall: {
    fontSize: 9,
    lineHeight: 11,
  },
  badgeTextMedium: {
    fontSize: 10,
    lineHeight: 12,
  },
});

export default ChatBadge;