import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { COLORS } from '../styles/colors';
import { SPACING, BORDER_RADIUS } from '../styles/spacing';
import { Icon } from './Icon';

interface SectionHeaderProps {
  emoji?: string;
  title: string;
  subtitle?: string;
  onSeeAll?: () => void;
  backgroundColor?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  emoji,
  title,
  subtitle,
  onSeeAll,
  backgroundColor,
}) => {
  const [seeAllHovered, setSeeAllHovered] = useState(false);

  const seeAllColor = seeAllHovered ? COLORS.primary.accent : COLORS.text.tertiary;

  // Web: div 기반 (hover 이벤트 지원)
  if (Platform.OS === 'web') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: `0 ${SPACING.xl}px`,
          marginBottom: SPACING.md,
          backgroundColor: backgroundColor || 'transparent',
        }}
      >
        {/* 왼쪽: 이모지 + 타이틀 + 서브타이틀 */}
        <div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {emoji && (
              <span style={{ fontSize: 20, lineHeight: '26px' }}>{emoji}</span>
            )}
            <span
              style={{
                fontSize: 19,
                fontWeight: '600',
                lineHeight: '26px',
                letterSpacing: -0.3,
                color: COLORS.text.primary,
              }}
            >
              {title}
            </span>
          </div>
          {subtitle && (
            <div
              style={{
                fontSize: 13,
                fontWeight: '400',
                lineHeight: '18px',
                color: COLORS.text.tertiary,
                marginTop: 4,
                marginLeft: emoji ? 28 : 0,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>

        {/* 오른쪽: 더보기 버튼 */}
        {onSeeAll && (
          <div
            onClick={onSeeAll}
            onMouseEnter={() => setSeeAllHovered(true)}
            onMouseLeave={() => setSeeAllHovered(false)}
            style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              minHeight: 44,
              paddingLeft: 8,
            }}
            role="link"
            aria-label={`${title} 더보기`}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: '500',
                color: seeAllColor,
                transition: 'color 150ms ease',
              }}
            >
              더보기
            </span>
            <Icon name="chevron-right" size={14} color={seeAllColor} />
          </div>
        )}
      </div>
    );
  }

  // Native: View/Text/TouchableOpacity 기반
  return (
    <View
      style={[
        styles.container,
        backgroundColor ? { backgroundColor } : undefined,
      ]}
    >
      {/* 왼쪽 영역 */}
      <View style={styles.leftSection}>
        <View style={styles.titleRow}>
          {emoji && <Text style={styles.emoji}>{emoji}</Text>}
          <Text style={styles.title}>{title}</Text>
        </View>
        {subtitle && (
          <Text
            style={[
              styles.subtitle,
              emoji ? { marginLeft: 28 } : undefined,
            ]}
          >
            {subtitle}
          </Text>
        )}
      </View>

      {/* 오른쪽: 더보기 버튼 */}
      {onSeeAll && (
        <TouchableOpacity
          onPress={onSeeAll}
          style={styles.seeAllButton}
          activeOpacity={0.7}
          accessibilityLabel={`${title} 더보기`}
          accessibilityRole="link"
        >
          <Text style={styles.seeAllText}>더보기</Text>
          <Icon name="chevron-right" size={14} color={COLORS.text.tertiary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
  },
  leftSection: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emoji: {
    fontSize: 20,
    lineHeight: 26,
  },
  title: {
    fontSize: 19,
    fontWeight: '600',
    lineHeight: 26,
    letterSpacing: -0.3,
    color: COLORS.text.primary,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
    color: COLORS.text.tertiary,
    marginTop: 4,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 44,
    paddingLeft: 8,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text.tertiary,
  },
});

export default SectionHeader;
