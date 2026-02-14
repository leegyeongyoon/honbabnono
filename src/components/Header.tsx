import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { COLORS, LAYOUT, SHADOWS, CSS_SHADOWS } from '../styles/colors';
import { TYPOGRAPHY } from '../styles/typography';
import { SPACING } from '../styles/spacing';
import { Icon } from './Icon';
import { NotificationBell } from './NotificationBell';

interface HeaderProps {
  /** 'home' shows logo + location selector, 'sub' shows back button + title */
  mode?: 'home' | 'sub';
  /** Page title (shown in center for sub mode) */
  title?: string;
  /** Location text (shown in center for home mode) */
  locationText?: string;
  /** Callback when location selector is pressed (home mode) */
  onLocationPress?: () => void;
  /** Callback when back button is pressed (sub mode) */
  onBackPress?: () => void;
  /** User ID for notification bell */
  userId?: string;
  /** Callback when notification bell is pressed */
  onNotificationPress?: () => void;
  /** Callback when settings icon is pressed */
  onSettingsPress?: () => void;
  /** Whether to show the notification bell */
  showNotification?: boolean;
  /** Whether to show the settings icon */
  showSettings?: boolean;
  /** Right side custom content */
  rightContent?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({
  mode = 'home',
  title,
  locationText,
  onLocationPress,
  onBackPress,
  userId,
  onNotificationPress,
  onSettingsPress,
  showNotification = true,
  showSettings = false,
  rightContent,
}) => {
  const renderLeft = () => {
    if (mode === 'home') {
      return (
        <Text style={styles.logoText} accessibilityRole="header">혼밥시러</Text>
      );
    }
    return (
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBackPress}
        activeOpacity={0.7}
        accessibilityLabel="뒤로 가기"
        accessibilityRole="button"
      >
        <Icon name="arrow-left" size={24} color={COLORS.text.primary} />
      </TouchableOpacity>
    );
  };

  const renderCenter = () => {
    if (mode === 'home') {
      if (onLocationPress) {
        return (
          <TouchableOpacity
            style={styles.locationSelector}
            onPress={onLocationPress}
            activeOpacity={0.7}
          >
            <Text style={styles.locationText} numberOfLines={1}>
              {locationText || '위치 선택'}
            </Text>
            <Icon name="chevron-down" size={14} color={COLORS.text.primary} />
          </TouchableOpacity>
        );
      }
      return null;
    }
    return (
      <Text style={styles.titleText} numberOfLines={1}>
        {title}
      </Text>
    );
  };

  const renderRight = () => {
    if (rightContent) {
      return <View style={styles.rightContainer}>{rightContent}</View>;
    }

    return (
      <View style={styles.rightContainer}>
        {showNotification && (
          <NotificationBell
            userId={userId}
            onPress={onNotificationPress || (() => {})}
            color={COLORS.text.primary}
            size={24}
          />
        )}
        {showSettings && (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onSettingsPress}
            activeOpacity={0.7}
          >
            <Icon name="settings" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.header}>
      <View style={styles.leftContainer}>{renderLeft()}</View>
      <View style={styles.centerContainer}>{renderCenter()}</View>
      <View style={styles.rightContainer}>{renderRight()}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: LAYOUT.HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.HEADER_PADDING_HORIZONTAL,
    paddingVertical: LAYOUT.HEADER_PADDING_VERTICAL,
    backgroundColor: COLORS.neutral.background + 'F2',
    ...SHADOWS.medium,
    ...(Platform.OS === 'web' ? {
      // @ts-ignore - web-only property
      backdropFilter: 'blur(10px)',
      // @ts-ignore - web-only property
      WebkitBackdropFilter: 'blur(10px)',
      boxShadow: CSS_SHADOWS.medium,
    } : {}),
  },
  leftContainer: {
    minWidth: 60,
    alignItems: 'flex-start',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
  },
  rightContainer: {
    minWidth: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  logoText: {
    ...TYPOGRAPHY.heading.h3,
    color: COLORS.primary.main,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    letterSpacing: -0.1,
  },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    letterSpacing: -0.05,
  },
  backButton: {
    padding: 4,
  },
  iconButton: {
    padding: 8,
  },
});

export default Header;
