import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, CSS_SHADOWS } from '../styles/colors';

const STORAGE_KEY = 'has_seen_onboarding';

interface OnboardingSlide {
  icon: string;
  title: string;
  subtitle: string;
}

const SLIDES: OnboardingSlide[] = [
  {
    icon: '🍽️🔍',
    title: '모임 찾기',
    subtitle: '내 주변의 식사 모임을 찾아보세요\n카테고리, 위치, 날짜로 원하는 모임을 쉽게 찾을 수 있어요',
  },
  {
    icon: '🤝💰',
    title: '참가 & 약속금',
    subtitle: '약속금으로 서로의 신뢰를 만들어요\n노쇼 없는 즐거운 식사 모임, 출석하면 약속금이 돌아와요',
  },
  {
    icon: '📍✅',
    title: 'GPS 체크인',
    subtitle: '만남 장소에서 간편하게 체크인\nGPS 또는 QR코드로 출석을 확인하세요',
  },
  {
    icon: '⭐📈',
    title: '리뷰 & 바발스코어',
    subtitle: '리뷰를 남기고 신뢰를 쌓아가세요\n바발스코어가 올라갈수록 더 좋은 모임에 참여할 수 있어요',
  },
];

const OnboardingScreen: React.FC = () => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const screenWidth = Dimensions.get('window').width;

  const completeOnboarding = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch (_e) {
      // localStorage unavailable
    }
    navigate('/login');
  }, [navigate]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / screenWidth);
      if (index >= 0 && index < SLIDES.length) {
        setCurrentIndex(index);
      }
    },
    [screenWidth],
  );

  const goToSlide = useCallback(
    (index: number) => {
      scrollViewRef.current?.scrollTo({
        x: index * screenWidth,
        animated: true,
      });
      setCurrentIndex(index);
    },
    [screenWidth],
  );

  const handleNext = useCallback(() => {
    if (currentIndex < SLIDES.length - 1) {
      goToSlide(currentIndex + 1);
    } else {
      completeOnboarding();
    }
  }, [currentIndex, goToSlide, completeOnboarding]);

  return (
    <View style={styles.container}>
      {/* Skip button */}
      <TouchableOpacity
        style={styles.skipButton}
        onPress={completeOnboarding}
        activeOpacity={0.7}
      >
        <Text style={styles.skipText}>건너뛰기</Text>
      </TouchableOpacity>

      {/* Slides */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {SLIDES.map((slide, index) => (
          <View
            key={index}
            style={[styles.slide, { width: screenWidth }]}
          >
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>{slide.icon}</Text>
            </View>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.subtitle}>{slide.subtitle}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Bottom controls */}
      <View style={styles.bottomContainer}>
        {/* Dot indicators */}
        <View style={styles.dotsContainer}>
          {SLIDES.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => goToSlide(index)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.dot,
                  index === currentIndex ? styles.dotActive : styles.dotInactive,
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Next / Start button */}
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>
            {currentIndex === SLIDES.length - 1 ? '시작하기' : '다음'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  skipButton: {
    position: 'absolute',
    top: 16,
    right: 20,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 15,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  icon: {
    fontSize: 56,
    lineHeight: 70,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 24,
    color: COLORS.text.secondary,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  bottomContainer: {
    paddingHorizontal: 20,
    paddingBottom: 48,
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: COLORS.primary.main,
    width: 24,
  },
  dotInactive: {
    backgroundColor: COLORS.neutral.grey300,
  },
  nextButton: {
    backgroundColor: COLORS.primary.main,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    // @ts-ignore
    boxShadow: CSS_SHADOWS.cta,
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
});

export default OnboardingScreen;
export { STORAGE_KEY as ONBOARDING_STORAGE_KEY };
