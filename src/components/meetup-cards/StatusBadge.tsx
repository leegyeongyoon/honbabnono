import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { COLORS } from '../../styles/colors';
import { BORDER_RADIUS } from '../../styles/spacing';
import type { MeetupStatus } from './types';
import { STATUS_CONFIG } from './types';

interface StatusBadgeProps {
  status: MeetupStatus;
  size: 'sm' | 'md';
  pulse?: boolean;
}

const SIZE = {
  sm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    fontSize: 9,
    dotSize: 5,
  },
  md: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    fontSize: 11,
    dotSize: 6,
  },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size, pulse }) => {
  const config = STATUS_CONFIG[status];
  if (!config) return null;

  const s = SIZE[size];
  const showPulse = pulse ?? config.pulse;

  const badge = (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bg,
          paddingHorizontal: s.paddingHorizontal,
          paddingVertical: s.paddingVertical,
          borderRadius: s.borderRadius,
        },
      ]}
    >
      {showPulse && (
        <View style={[styles.dot, { width: s.dotSize, height: s.dotSize, borderRadius: s.dotSize / 2 }]} />
      )}
      <Text style={[styles.label, { fontSize: s.fontSize }]}>{config.label}</Text>
    </View>
  );

  // CSS pulse animation for web
  if (Platform.OS === 'web' && showPulse) {
    return (
      <>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @keyframes statusPulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
              }
              .status-pulse .status-dot {
                animation: statusPulse 1.8s ease-in-out infinite;
              }
            `,
          }}
        />
        <div className="status-pulse" style={{ display: 'inline-flex' }}>
          {badge}
        </div>
      </>
    );
  }

  return badge;
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    backgroundColor: COLORS.neutral.white,
  },
  label: {
    fontWeight: '600',
    color: COLORS.text.white,
    letterSpacing: 0.1,
  },
});

export default StatusBadge;
