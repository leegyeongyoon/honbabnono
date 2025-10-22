import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import {COLORS, SHADOWS} from '../styles/colors';

const LoginScreen = () => {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // URL에서 OAuth 결과 확인
    const urlParams = new URLSearchParams(window.location.hash);
    const token = urlParams.get('token');
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    const userParam = urlParams.get('user');

    if (success === 'true' && token) {
      // 카카오 로그인 성공
      localStorage.setItem('token', token);
      if (userParam) {
        localStorage.setItem('user', decodeURIComponent(userParam));
      }
      Alert.alert('환영합니다! 🎉', '카카오 로그인이 완료되었습니다.');
      window.location.href = '/';
    } else if (error) {
      const errorMessages: { [key: string]: string } = {
        'kakao_auth_failed': '카카오 인증에 실패했습니다.',
        'no_auth_code': '인증 코드를 받지 못했습니다.',
        'kakao_login_failed': '카카오 로그인 처리에 실패했습니다.'
      };
      Alert.alert('로그인 실패', errorMessages[error] || '알 수 없는 오류가 발생했습니다.');
    }
  }, []);

  const handleKakaoLogin = () => {
    setLoading(true);
    const kakaoAuthUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/auth/kakao`;
    window.location.href = kakaoAuthUrl;
  };

  return (
    <View style={styles.container}>
      {/* 배경 그라데이션 */}
      <View style={styles.backgroundGradient} />
      
      {/* 로고 섹션 */}
      <View style={styles.logoSection}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoEmoji}>🍽️</Text>
          <Text style={styles.appName}>혼밥시러</Text>
        </View>
        <Text style={styles.tagline}>혼자 먹는 밥은 이제 그만!</Text>
        <Text style={styles.description}>
          따뜻한 사람들과 함께하는 맛있는 식사를 시작해보세요
        </Text>
      </View>

      {/* 메인 컨테이너 */}
      <View style={styles.mainContainer}>
        <View style={styles.loginCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.welcomeText}>환영합니다! 👋</Text>
            <Text style={styles.loginSubtitle}>카카오 계정으로 간편하게 시작하세요</Text>
          </View>

          {/* 카카오 로그인 버튼 */}
          <TouchableOpacity
            style={[styles.kakaoButton, loading && styles.disabledButton]}
            onPress={handleKakaoLogin}
            disabled={loading}
          >
            <View style={styles.kakaoButtonContent}>
              <View style={styles.kakaoLogo}>
                <Text style={styles.kakaoLogoText}>카</Text>
              </View>
              <Text style={styles.kakaoButtonText}>
                {loading ? '로그인 중...' : '카카오로 시작하기'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* 기능 소개 */}
          <View style={styles.featuresSection}>
            <Text style={styles.featuresTitle}>혼밥시러에서 할 수 있는 일</Text>
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>🔍</Text>
                <Text style={styles.featureText}>내 주변 맛집 모임 찾기</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>👥</Text>
                <Text style={styles.featureText}>새로운 사람들과 만남</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>✨</Text>
                <Text style={styles.featureText}>취향 맞는 모임 추천</Text>
              </View>
            </View>
          </View>

          {/* 개인정보 정책 */}
          <View style={styles.policyContainer}>
            <Text style={styles.policyText}>
              로그인 시{' '}
              <TouchableOpacity onPress={() => Alert.alert('이용약관', '이용약관 내용을 확인하세요.')}>
                <Text style={styles.policyLink}>이용약관</Text>
              </TouchableOpacity>
              {' '}및{' '}
              <TouchableOpacity onPress={() => Alert.alert('개인정보처리방침', '개인정보처리방침을 확인하세요.')}>
                <Text style={styles.policyLink}>개인정보처리방침</Text>
              </TouchableOpacity>
              에 동의하게 됩니다.
            </Text>
          </View>
        </View>
      </View>

      {/* 푸터 */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2024 혼밥시러. Made with ❤️</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
    position: 'relative',
    minHeight: '100vh',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    background: `linear-gradient(135deg, ${COLORS.primary.light} 0%, ${COLORS.primary.main} 50%, ${COLORS.secondary.main} 100%)`,
  },
  logoSection: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 40,
    zIndex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  appName: {
    fontSize: 42,
    fontWeight: 'bold',
    color: COLORS.text.white,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tagline: {
    fontSize: 22,
    color: COLORS.text.white,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 24,
  },
  mainContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    zIndex: 1,
    marginTop: -20,
  },
  loginCard: {
    maxWidth: 440,
    alignSelf: 'center',
    width: '100%',
    backgroundColor: COLORS.neutral.white,
    borderRadius: 24,
    padding: 32,
    ...SHADOWS.large,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 15,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  loginSubtitle: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  kakaoButton: {
    backgroundColor: '#FEE500',
    borderRadius: 16,
    padding: 18,
    marginBottom: 32,
    ...SHADOWS.medium,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  kakaoButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kakaoLogo: {
    width: 24,
    height: 24,
    backgroundColor: '#000',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  kakaoLogoText: {
    color: '#FEE500',
    fontSize: 14,
    fontWeight: 'bold',
  },
  kakaoButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
  featuresSection: {
    marginBottom: 28,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  featureIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 32,
    textAlign: 'center',
  },
  featureText: {
    fontSize: 15,
    color: COLORS.text.secondary,
    flex: 1,
  },
  policyContainer: {
    paddingHorizontal: 8,
  },
  policyText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  policyLink: {
    color: COLORS.primary.main,
    fontWeight: '600',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
});

export default LoginScreen;