import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { COLORS, CSS_SHADOWS, TRANSITIONS } from '../styles/colors';
import { BORDER_RADIUS, SPACING } from '../styles/spacing';

interface SummaryItem {
  label: string;
  value: number;
  color?: string;
}

interface SummaryHeroProps {
  items: SummaryItem[];
}

const SummaryHero: React.FC<SummaryHeroProps> = ({ items }) => {
  if (Platform.OS === 'web') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          margin: '0 20px',
          marginTop: 16,
          marginBottom: 8,
          background: COLORS.gradient.subtleGold,
          borderRadius: 14,
          border: `1px solid ${COLORS.neutral.grey100}`,
          boxShadow: CSS_SHADOWS.card,
          overflow: 'hidden',
        }}
      >
        {items.map((item, idx) => (
          <React.Fragment key={item.label}>
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '18px 8px',
                gap: 4,
              }}
            >
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: item.color || COLORS.text.primary,
                  letterSpacing: -0.5,
                  lineHeight: '28px',
                }}
              >
                {item.value}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: COLORS.text.tertiary,
                  letterSpacing: -0.1,
                }}
              >
                {item.label}
              </span>
            </div>
            {idx < items.length - 1 && (
              <div
                style={{
                  width: 1,
                  height: 32,
                  backgroundColor: COLORS.neutral.grey100,
                  alignSelf: 'center',
                }}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  return (
    <View style={styles.container}>
      {items.map((item, idx) => (
        <React.Fragment key={item.label}>
          <View style={styles.itemWrap}>
            <Text style={[styles.value, item.color ? { color: item.color } : undefined]}>
              {item.value}
            </Text>
            <Text style={styles.label}>{item.label}</Text>
          </View>
          {idx < items.length - 1 && <View style={styles.divider} />}
        </React.Fragment>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: COLORS.neutral.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
    overflow: 'hidden',
  },
  itemWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 8,
    gap: 4,
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text.primary,
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text.tertiary,
    letterSpacing: -0.1,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.neutral.grey100,
    alignSelf: 'center',
  },
});

export default SummaryHero;
