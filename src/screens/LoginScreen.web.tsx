import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import {COLORS, SHADOWS, CSS_SHADOWS} from '../styles/colors';
import apiClient from '../services/apiClient';
import { Icon } from '../components/Icon';
import { FeatureFlags } from '../utils/featureFlags';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { FadeIn } from '../components/animated';
import { useUserStore } from '../store/userStore';

const LoginScreen = () => {
  const [loading, setLoading] = useState(false);
  const { toast, showSuccess, showError, hideToast } = useToast();
  const { login } = useUserStore();

  useEffect(() => {
    // URL에서 OAuth 결과 확인
    const urlParams = new URLSearchParams(window.location.hash);
    const token = urlParams.get('token');
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    const userParam = urlParams.get('user');

    if (success === 'true' && token) {
      // 카카오 로그인 성공 — zustand store 통해 로그인 처리
      localStorage.setItem('token', token);
      let userData: any = null;
      if (userParam) {
        try {
          userData = JSON.parse(decodeURIComponent(userParam));
          localStorage.setItem('user', JSON.stringify(userData));
        } catch (_e) { /* ignore */ }
      }
      if (userData) {
        login(userData, token);
      }
      showSuccess('카카오 로그인이 완료되었습니다.');
      window.location.href = '/home';
    } else if (error) {
      const errorMessages: { [key: string]: string } = {
        'kakao_auth_failed': '카카오 인증에 실패했습니다.',
        'no_auth_code': '인증 코드를 받지 못했습니다.',
        'kakao_login_failed': '카카오 로그인 처리에 실패했습니다.'
      };
      showError(errorMessages[error] || '알 수 없는 오류가 발생했습니다.');
    }
  }, []);

  const handleKakaoLogin = () => {
    setLoading(true);
    const kakaoAuthUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/auth/kakao`;
    window.location.href = kakaoAuthUrl;
  };

  const handleQuickLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/auth/test-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: 'test1@test.com' }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        login(data.user, data.token);
        showSuccess(data.user.name + '으로 로그인되었습니다.');
        window.location.href = '/home';
      } else {
        showError('빠른 테스트 로그인에 실패했습니다.');
      }
    } catch (error) {
      showError('서버 연결에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestLogin = async (email: string, name: string) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/auth/test-login', { email });

      if (response.data) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        login(response.data.user, response.data.token);
        showSuccess(name + '으로 로그인되었습니다.');
        window.location.href = '/home';
      } else {
        showError('테스트 로그인에 실패했습니다.');
      }
    } catch (error) {
      showError('서버 연결에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 배경 그라데이션 */}
      <View style={styles.backgroundGradient} />

      {/* 로고 섹션 */}
      <FadeIn delay={0}>
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <Icon name="utensils" size={48} color={COLORS.primary.main} />
            <Text style={styles.appName}>혼밥시러</Text>
          </View>
          <Text style={styles.tagline}>혼자 먹는 밥은 이제 그만!</Text>
          <Text style={styles.description}>
            따뜻한 사람들과 함께하는 맛있는 식사를 시작해보세요
          </Text>
        </View>
      </FadeIn>

      {/* 메인 컨테이너 */}
      <FadeIn delay={100}>
        <View style={styles.mainContainer}>
          <View style={styles.loginCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.welcomeText}>환영합니다!</Text>
              <Text style={styles.loginSubtitle}>카카오 계정으로 간편하게 시작하세요</Text>
            </View>

          {/* 카카오 로그인 버튼 */}
          {Platform.OS === 'web' ? (
            <div
              onClick={loading ? undefined : handleKakaoLogin}
              style={{
                background: 'linear-gradient(135deg, #FEE500 0%, #FFD700 100%)',
                borderRadius: 12,
                paddingTop: 16,
                paddingBottom: 16,
                paddingLeft: 20,
                paddingRight: 20,
                marginBottom: 16,
                cursor: loading ? 'default' : 'pointer',
                opacity: loading ? 0.6 : 1,
                boxShadow: '0 4px 16px rgba(254, 229, 0, 0.3)',
                transition: 'transform 150ms ease, box-shadow 150ms ease',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(254, 229, 0, 0.45)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(254, 229, 0, 0.3)';
              }}
            >
              <View style={styles.kakaoButtonContent}>
                <View style={styles.kakaoLogo}>
                  <Text style={styles.kakaoLogoText}>카</Text>
                </View>
                <Text style={styles.kakaoButtonText}>
                  {loading ? '로그인 중...' : '카카오로 시작하기'}
                </Text>
              </View>
            </div>
          ) : (
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
          )}

          {FeatureFlags.SHOW_TEST_LOGIN && (
            <>
              {/* 구분선 */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>또는</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* 테스트 로그인 버튼들 */}
              <View style={styles.testLoginSection}>
                <Text style={styles.testLoginTitle}>빠른 테스트 로그인</Text>
                <View style={styles.testButtonsContainer}>
                  <TouchableOpacity
                    style={[styles.testButton, loading && styles.disabledButton]}
                    onPress={handleQuickLogin}
                    disabled={loading}
                  >
                    <Text style={styles.testButtonText}>빠른 로그인</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.testButton, loading && styles.disabledButton]}
                    onPress={() => handleTestLogin('test2@test.com', '테스트유저2')}
                    disabled={loading}
                  >
                    <Text style={styles.testButtonText}>테스트유저2</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.testButton, loading && styles.disabledButton]}
                    onPress={() => handleTestLogin('test3@test.com', '테스트유저3')}
                    disabled={loading}
                  >
                    <Text style={styles.testButtonText}>테스트유저3</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          {/* 기능 소개 */}
          <FadeIn delay={200}>
            <View style={styles.featuresSection}>
              <Text style={styles.featuresTitle}>혼밥시러에서 할 수 있는 일</Text>
              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Icon name="search" size={20} color={COLORS.primary.main} />
                  </View>
                  <Text style={styles.featureText}>내 주변 맛집 모임 찾기</Text>
                </View>
                <View style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Icon name="users" size={20} color={COLORS.primary.main} />
                  </View>
                  <Text style={styles.featureText}>새로운 사람들과 만남</Text>
                </View>
                <View style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Icon name="star" size={20} color={COLORS.primary.main} />
                  </View>
                  <Text style={styles.featureText}>취향 맞는 모임 추천</Text>
                </View>
              </View>
            </View>
          </FadeIn>

          {/* 개인정보 정책 */}
          <View style={styles.policyContainer}>
            <Text style={styles.policyText}>
              로그인 시{' '}
              <TouchableOpacity>
                <Text style={styles.policyLink}>이용약관</Text>
              </TouchableOpacity>
              {' '}및{' '}
              <TouchableOpacity>
                <Text style={styles.policyLink}>개인정보처리방침</Text>
              </TouchableOpacity>
              에 동의하게 됩니다.
            </Text>
          </View>
        </View>
      </View>
      </FadeIn>

      {/* 푸터 */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2024 혼밥시러. Made with love</Text>
      </View>

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />
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
    height: '100%',
    background: `linear-gradient(135deg, ${COLORS.neutral.background} 0%, ${COLORS.primary.light} 50%, ${COLORS.primary.light} 100%)`,
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
    fontSize: 48,
    marginBottom: 20,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  appName: {
    fontSize: 44,
    fontWeight: '800',
    color: COLORS.neutral.grey600,
    letterSpacing: -1,
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(139, 105, 20, 0.3)',
    paddingBottom: 4,
  },
  tagline: {
    fontSize: 15,
    color: COLORS.text.secondary,
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 24,
  },
  mainContainer: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
    zIndex: 1,
    marginTop: -20,
  },
  loginCard: {
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
    backgroundColor: COLORS.neutral.white,
    borderRadius: 16,
    padding: 16,
    border: `1px solid ${COLORS.neutral.grey100}`,
    boxSizing: 'border-box',
    ...SHADOWS.medium,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text.primary,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  loginSubtitle: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  kakaoButton: {
    backgroundColor: COLORS.special.kakao,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
    ...SHADOWS.medium,
    transform: [{ scale: 1 }],
  },
  kakaoButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kakaoLogo: {
    width: 24,
    height: 24,
    backgroundColor: COLORS.neutral.black,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  kakaoLogoText: {
    color: COLORS.functional.warning,
    fontSize: 14,
    fontWeight: 'bold',
  },
  kakaoButtonText: {
    color: COLORS.neutral.black,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  disabledButton: {
    opacity: 0.6,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.neutral.grey100,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  testLoginSection: {
    marginBottom: 32,
  },
  testLoginTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  testButtonsContainer: {
    gap: 8,
  },
  testButton: {
    backgroundColor: COLORS.neutral.white,
    borderWidth: 1,
    borderColor: COLORS.secondary.main,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  testButtonText: {
    color: COLORS.text.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  featuresSection: {
    marginBottom: 28,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: COLORS.primary.accent,
    borderRadius: 12,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary.light,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 105, 20, 0.15)',
    ...SHADOWS.small,
  },
  featureText: {
    fontSize: 15,
    color: COLORS.text.secondary,
    flex: 1,
  },
  policyContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'rgba(240, 230, 221, 0.3)',
    borderRadius: 12,
  },
  policyText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
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
