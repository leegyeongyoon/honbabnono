// 잇테이블(EatTable) 디자인 토큰 통합 배럴 파일
// Figma 와이어프레임 기반 디자인 시스템

export { COLORS, LAYOUT, SHADOWS, CSS_SHADOWS, withOpacity, CARD_STYLE, CTA_STYLE, BADGE_STYLES, ANIMATION_TOKENS, Z_INDEX, TRANSITIONS, BREAKPOINTS } from './colors';
export { TYPOGRAPHY, FONT_WEIGHTS } from './typography';
export { SPACING, BORDER_RADIUS } from './spacing';

// ─── 통합 테마 객체 ───────────────────────────────────────────
import { COLORS, LAYOUT, SHADOWS, CSS_SHADOWS, withOpacity, CARD_STYLE, CTA_STYLE, BADGE_STYLES, ANIMATION_TOKENS, Z_INDEX, TRANSITIONS, BREAKPOINTS } from './colors';
import { TYPOGRAPHY, FONT_WEIGHTS } from './typography';
import { SPACING, BORDER_RADIUS } from './spacing';

export const theme = {
  colors: COLORS,
  typography: TYPOGRAPHY,
  fontWeights: FONT_WEIGHTS,
  spacing: SPACING,
  borderRadius: BORDER_RADIUS,
  shadows: SHADOWS,
  cssShadows: CSS_SHADOWS,
  layout: LAYOUT,
  cardStyle: CARD_STYLE,
  ctaStyle: CTA_STYLE,
  badgeStyles: BADGE_STYLES,
  animationTokens: ANIMATION_TOKENS,
  zIndex: Z_INDEX,
  transitions: TRANSITIONS,
  breakpoints: BREAKPOINTS,
  withOpacity,
} as const;

// ─── TypeScript 타입 정의 ─────────────────────────────────────
export type Theme = typeof theme;
export type Colors = typeof COLORS;
export type Typography = typeof TYPOGRAPHY;
export type Spacing = typeof SPACING;
export type BorderRadius = typeof BORDER_RADIUS;
export type Shadows = typeof SHADOWS;
export type Layout = typeof LAYOUT;

export type ColorKey = keyof Colors;
export type SpacingKey = keyof Pick<Spacing, 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl'>;
export type BorderRadiusKey = keyof BorderRadius;
export type ShadowKey = keyof Shadows;
export type CardStyle = typeof CARD_STYLE;
export type CTAStyle = typeof CTA_STYLE;
export type BadgeStyles = typeof BADGE_STYLES;
