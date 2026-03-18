import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Dimensions,
  StyleSheet,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { HERO_BANNERS, HeroBannerItem } from '../constants/heroBannerData';
import { COLORS } from '../styles/colors';
import { SPACING, BORDER_RADIUS } from '../styles/spacing';

const AUTO_SCROLL_INTERVAL = 5000;
const CARD_HEIGHT = 130;
const HORIZONTAL_PADDING = SPACING.xl; // 24

const ILLUSTRATION_MAP: Record<HeroBannerItem['illustration'], string> = {
  bowl: '\uD83C\uDF5A',
  people: '\uD83D\uDC65',
  map: '\uD83D\uDCCD',
  'rice-score': '\u2B50',
};

const HeroBannerCarousel: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const screenWidth = Dimensions.get('window').width;
  const cardWidth = screenWidth - HORIZONTAL_PADDING * 2;

  const startAutoScroll = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        const nextIndex = (prev + 1) % HERO_BANNERS.length;
        scrollViewRef.current?.scrollTo({
          x: nextIndex * cardWidth,
          animated: true,
        });
        return nextIndex;
      });
    }, AUTO_SCROLL_INTERVAL);
  }, [cardWidth]);

  const stopAutoScroll = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    startAutoScroll();
    return stopAutoScroll;
  }, [startAutoScroll, stopAutoScroll]);

  const handleScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / cardWidth);
      setCurrentIndex(index);
      // Restart auto-scroll after manual swipe
      stopAutoScroll();
      startAutoScroll();
    },
    [cardWidth, stopAutoScroll, startAutoScroll],
  );

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollBeginDrag={stopAutoScroll}
        contentContainerStyle={{ paddingHorizontal: HORIZONTAL_PADDING }}
        decelerationRate="fast"
        snapToInterval={cardWidth}
        snapToAlignment="start"
      >
        {HERO_BANNERS.map((banner) => (
          <LinearGradient
            key={banner.id}
            colors={[banner.gradientStart, banner.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.card, { width: cardWidth }]}
          >
            {/* Decorative circles */}
            <View style={styles.decorCircle1} />
            <View style={styles.decorCircle2} />

            {/* Text content */}
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{banner.title}</Text>
              <Text style={styles.cardSubtitle}>{banner.subtitle}</Text>
            </View>

            {/* Emoji illustration */}
            <View style={styles.illustrationWrap}>
              <Text style={styles.illustration}>
                {ILLUSTRATION_MAP[banner.illustration]}
              </Text>
            </View>
          </LinearGradient>
        ))}
      </ScrollView>

      {/* Dot indicators */}
      <View style={styles.dotRow}>
        {HERO_BANNERS.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === currentIndex ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  card: {
    height: CARD_HEIGHT,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  decorCircle1: {
    position: 'absolute',
    top: -20,
    right: 60,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -30,
    right: -10,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
    marginTop: 6,
  },
  illustrationWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  illustration: {
    fontSize: 28,
  },
  dotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 18,
    backgroundColor: COLORS.primary.accent,
  },
  dotInactive: {
    width: 6,
    backgroundColor: COLORS.neutral.grey200,
  },
});

export default HeroBannerCarousel;
