import React from 'react';
import { RefreshControl, Platform } from 'react-native';
import { COLORS } from '../styles/colors';

interface BrandedRefreshControlProps {
  refreshing: boolean;
  onRefresh: () => void;
  tintColor?: string;
  title?: string;
}

const BrandedRefreshControl: React.FC<BrandedRefreshControlProps> = ({
  refreshing,
  onRefresh,
  tintColor = COLORS.primary.main,
  title = '\uC0C8\uB85C\uACE0\uCE68 \uC911...',
}) => (
  <RefreshControl
    refreshing={refreshing}
    onRefresh={onRefresh}
    tintColor={tintColor}
    colors={[COLORS.primary.main, COLORS.primary.dark]}
    progressBackgroundColor={COLORS.neutral.white}
    title={Platform.OS === 'ios' ? title : undefined}
    titleColor={COLORS.text.tertiary}
  />
);

export default BrandedRefreshControl;
