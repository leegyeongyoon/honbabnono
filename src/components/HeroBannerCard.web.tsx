import React from 'react';
import { HeroBannerItem } from '../constants/heroBannerData';
import { BORDER_RADIUS } from '../styles/spacing';

interface Props {
  banner: HeroBannerItem;
  width: number;
}

// 밥그릇 + 젓가락
const BowlIllustration = () => (
  <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
    {/* 젓가락 */}
    <rect x="58" y="8" width="3" height="50" rx="1.5" fill="rgba(255,255,255,0.18)" transform="rotate(15 58 8)" />
    <rect x="68" y="10" width="3" height="48" rx="1.5" fill="rgba(255,255,255,0.13)" transform="rotate(10 68 10)" />
    {/* 그릇 */}
    <ellipse cx="50" cy="72" rx="38" ry="14" fill="rgba(255,255,255,0.12)" />
    <path d="M12 62 C12 62, 14 85, 50 85 C86 85, 88 62, 88 62" fill="rgba(255,255,255,0.18)" />
    <ellipse cx="50" cy="62" rx="38" ry="12" fill="rgba(255,255,255,0.22)" />
    {/* 밥 (곡선) */}
    <path d="M22 60 Q30 48, 40 54 Q50 46, 60 52 Q70 46, 78 58" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    {/* 김가루 점 */}
    <circle cx="35" cy="56" r="1.5" fill="rgba(255,255,255,0.15)" />
    <circle cx="50" cy="53" r="1" fill="rgba(255,255,255,0.12)" />
    <circle cx="62" cy="55" r="1.5" fill="rgba(255,255,255,0.15)" />
  </svg>
);

// 함께 식사하는 사람들
const PeopleIllustration = () => (
  <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
    {/* 테이블 */}
    <rect x="15" y="62" width="70" height="4" rx="2" fill="rgba(255,255,255,0.18)" />
    <rect x="25" y="66" width="4" height="20" rx="2" fill="rgba(255,255,255,0.12)" />
    <rect x="71" y="66" width="4" height="20" rx="2" fill="rgba(255,255,255,0.12)" />
    {/* 왼쪽 사람 */}
    <circle cx="30" cy="38" r="10" fill="rgba(255,255,255,0.2)" />
    <path d="M18 62 C18 50, 30 46, 30 46 C30 46, 42 50, 42 62" fill="rgba(255,255,255,0.15)" />
    {/* 오른쪽 사람 */}
    <circle cx="70" cy="38" r="10" fill="rgba(255,255,255,0.2)" />
    <path d="M58 62 C58 50, 70 46, 70 46 C70 46, 82 50, 82 62" fill="rgba(255,255,255,0.15)" />
    {/* 접시들 */}
    <ellipse cx="40" cy="58" rx="8" ry="3" fill="rgba(255,255,255,0.12)" />
    <ellipse cx="60" cy="58" rx="8" ry="3" fill="rgba(255,255,255,0.12)" />
    {/* 하트 */}
    <path d="M47 28 C47 24, 50 22, 50 26 C50 22, 53 24, 53 28 C53 32, 50 34, 50 34 C50 34, 47 32, 47 28Z" fill="rgba(255,255,255,0.25)" />
  </svg>
);

// 지도 + 포크
const MapIllustration = () => (
  <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
    {/* 지도 핀 */}
    <path d="M50 15 C38 15, 28 25, 28 37 C28 55, 50 75, 50 75 C50 75, 72 55, 72 37 C72 25, 62 15, 50 15Z" fill="rgba(255,255,255,0.18)" />
    <circle cx="50" cy="37" r="12" fill="rgba(255,255,255,0.22)" />
    {/* 핀 안 포크+나이프 */}
    <rect x="46" y="28" width="2" height="18" rx="1" fill="rgba(255,255,255,0.3)" />
    <path d="M52 28 L52 34 L55 28" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    {/* 물결 (동네 느낌) */}
    <path d="M18 82 Q30 76, 42 82 Q54 88, 66 82 Q78 76, 88 82" stroke="rgba(255,255,255,0.12)" strokeWidth="2" fill="none" />
    <path d="M18 88 Q30 82, 42 88 Q54 94, 66 88 Q78 82, 88 88" stroke="rgba(255,255,255,0.08)" strokeWidth="2" fill="none" />
  </svg>
);

// 밥알지수 (쌀알 + 게이지)
const RiceScoreIllustration = () => (
  <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
    {/* 쌀알들 */}
    <ellipse cx="35" cy="30" rx="6" ry="10" fill="rgba(255,255,255,0.2)" transform="rotate(-20 35 30)" />
    <ellipse cx="55" cy="25" rx="5" ry="9" fill="rgba(255,255,255,0.16)" transform="rotate(15 55 25)" />
    <ellipse cx="70" cy="35" rx="5" ry="8" fill="rgba(255,255,255,0.13)" transform="rotate(-10 70 35)" />
    {/* 게이지 바 */}
    <rect x="15" y="60" width="70" height="8" rx="4" fill="rgba(255,255,255,0.12)" />
    <rect x="15" y="60" width="50" height="8" rx="4" fill="rgba(255,255,255,0.25)" />
    {/* 별 */}
    <path d="M50 74 L52 80 L58 80 L53 84 L55 90 L50 86 L45 90 L47 84 L42 80 L48 80Z" fill="rgba(255,255,255,0.2)" />
    {/* 작은 반짝임 */}
    <circle cx="25" cy="45" r="2" fill="rgba(255,255,255,0.15)" />
    <circle cx="78" cy="50" r="1.5" fill="rgba(255,255,255,0.12)" />
  </svg>
);

const ILLUSTRATIONS: Record<HeroBannerItem['illustration'], React.FC> = {
  'bowl': BowlIllustration,
  'people': PeopleIllustration,
  'map': MapIllustration,
  'rice-score': RiceScoreIllustration,
};

const HeroBannerCard: React.FC<Props> = ({ banner, width }) => {
  const Illustration = ILLUSTRATIONS[banner.illustration];

  return (
    <div
      style={{
        width,
        height: 130,
        borderRadius: BORDER_RADIUS.md,
        background: `linear-gradient(135deg, ${banner.gradientStart} 0%, ${banner.gradientEnd} 100%)`,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: 24,
        paddingRight: 12,
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
        boxSizing: 'border-box' as const,
      }}
    >
      {/* 텍스트 영역 */}
      <div style={{ flex: 1, zIndex: 1 }}>
        <div style={{
          fontSize: 20,
          fontWeight: 700,
          lineHeight: '28px',
          color: '#FFFFFF',
          letterSpacing: -0.3,
          marginBottom: 6,
        }}>
          {banner.title}
        </div>
        <div style={{
          fontSize: 13,
          fontWeight: 400,
          lineHeight: '18px',
          color: 'rgba(255,255,255,0.8)',
        }}>
          {banner.subtitle}
        </div>
      </div>

      {/* SVG 일러스트 (오른쪽) */}
      <div style={{
        width: 100,
        height: 100,
        flexShrink: 0,
        opacity: 0.9,
      }}>
        <Illustration />
      </div>

      {/* 배경 장식 원 */}
      <div style={{
        position: 'absolute',
        top: -20,
        right: -20,
        width: 100,
        height: 100,
        borderRadius: 50,
        background: 'rgba(255,255,255,0.06)',
      }} />
      <div style={{
        position: 'absolute',
        bottom: -30,
        left: '40%',
        width: 80,
        height: 80,
        borderRadius: 40,
        background: 'rgba(255,255,255,0.04)',
      }} />
    </div>
  );
};

export default HeroBannerCard;
