import React, { useState, useEffect, useRef, useCallback } from 'react';
import HeroBannerCard from './HeroBannerCard.web';
import { HERO_BANNERS } from '../constants/heroBannerData';
import { COLORS } from '../styles/colors';
import { SPACING } from '../styles/spacing';

const AUTO_ROLL_INTERVAL = 5000;
const SWIPE_THRESHOLD = 50;

const HeroBannerCarousel: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardWidth, setCardWidth] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const dragCurrentX = useRef(0);
  const isDragging = useRef(false);
  const [dragOffset, setDragOffset] = useState(0);

  // 트랙(패딩 안쪽) 너비 측정
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const measure = () => {
      const w = el.parentElement?.clientWidth;
      if (w && w > 0) {
        // 부모의 clientWidth = padding 제외한 내부 너비
        setCardWidth(w - SPACING.xl * 2);
      }
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el.parentElement!);
    return () => observer.disconnect();
  }, []);

  // 자동 롤링
  const startAutoRoll = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % HERO_BANNERS.length);
    }, AUTO_ROLL_INTERVAL);
  }, []);

  const stopAutoRoll = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    startAutoRoll();
    return stopAutoRoll;
  }, [startAutoRoll, stopAutoRoll]);

  // 드래그/스와이프 핸들러
  const handleDragStart = (clientX: number) => {
    isDragging.current = true;
    dragStartX.current = clientX;
    dragCurrentX.current = clientX;
    stopAutoRoll();
  };

  const handleDragMove = (clientX: number) => {
    if (!isDragging.current) return;
    dragCurrentX.current = clientX;
    setDragOffset(clientX - dragStartX.current);
  };

  const handleDragEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const diff = dragCurrentX.current - dragStartX.current;

    if (Math.abs(diff) > SWIPE_THRESHOLD) {
      if (diff < 0) {
        setCurrentIndex((prev) => (prev + 1) % HERO_BANNERS.length);
      } else {
        setCurrentIndex((prev) => (prev - 1 + HERO_BANNERS.length) % HERO_BANNERS.length);
      }
    }

    setDragOffset(0);
    startAutoRoll();
  };

  const goToIndex = (index: number) => {
    setCurrentIndex(index);
    stopAutoRoll();
    startAutoRoll();
  };

  const translateX = cardWidth > 0
    ? -(currentIndex * (cardWidth + 12)) + dragOffset
    : 0;

  return (
    <div
      style={{
        padding: `0 ${SPACING.xl}px`,
        marginBottom: SPACING.md,
        overflow: 'hidden',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      onMouseEnter={stopAutoRoll}
      onMouseLeave={startAutoRoll}
    >
      {/* 카드 트랙 */}
      <div
        ref={trackRef}
        className={isDragging.current ? undefined : 'carousel-track'}
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: 12,
          transform: `translateX(${translateX}px)`,
          cursor: isDragging.current ? 'grabbing' : 'grab',
        }}
        onMouseDown={(e) => { e.preventDefault(); handleDragStart(e.clientX); }}
        onMouseMove={(e) => handleDragMove(e.clientX)}
        onMouseUp={handleDragEnd}
        onMouseLeave={() => { if (isDragging.current) handleDragEnd(); }}
        onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
        onTouchEnd={handleDragEnd}
      >
        {HERO_BANNERS.map((banner) => (
          <HeroBannerCard
            key={banner.id}
            banner={banner}
            width={cardWidth || 300}
          />
        ))}
      </div>

      {/* 도트 인디케이터 */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        marginTop: 12,
      }}>
        {HERO_BANNERS.map((_, index) => (
          <div
            key={index}
            onClick={() => goToIndex(index)}
            style={{
              width: index === currentIndex ? 18 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: index === currentIndex
                ? COLORS.primary.accent
                : COLORS.neutral.grey200,
              cursor: 'pointer',
              transition: 'all 300ms ease',
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroBannerCarousel;
