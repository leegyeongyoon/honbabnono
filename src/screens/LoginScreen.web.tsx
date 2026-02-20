import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import {COLORS, SHADOWS, CSS_SHADOWS} from '../styles/colors';
import {TYPOGRAPHY, FONT_WEIGHTS} from '../styles/typography';
import {SPACING, BORDER_RADIUS} from '../styles/spacing';
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
      {/* 배경 — 딥 차콜 to 다크 브라운 그라데이션 */}
      <View style={styles.backgroundGradient} />
      {/* 장식 — 미니멀 기하학적 요소 */}
      <div style={{
        position: 'absolute', top: -40, right: -30,
        width: 180, height: 180, borderRadius: 90,
        background: 'radial-gradient(circle, rgba(224,146,110,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: 60, left: -50,
        width: 140, height: 140, borderRadius: 70,
        background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* 로고 섹션 */}
      <FadeIn delay={0}>
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            {/* 브랜드 마크 — 테라코타 악센트 */}
            <div style={{
              width: 72,
              height: 72,
              borderRadius: BORDER_RADIUS.lg,
              background: COLORS.gradient.ctaCSS,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: CSS_SHADOWS.cta,
              marginBottom: 16,
            }}>
              <span style={{
                fontSize: 32,
                fontWeight: '700',
                color: '#FFFFFF',
                letterSpacing: -1,
                lineHeight: '32px',
              }}>E</span>
            </div>
            <Text style={styles.appName}>잇테이블</Text>
          </View>
          <Text style={styles.tagline}>함께 먹으면 더 맛있으니까</Text>
        </View>
      </FadeIn>

      {/* 메인 컨테이너 */}
      <FadeIn delay={100}>
        <View style={styles.mainContainer}>
          <View style={styles.loginCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.welcomeText}>환영합니다</Text>
              <Text style={styles.loginSubtitle}>카카오 계정으로 간편하게 시작하세요</Text>
            </View>

          {/* 카카오 로그인 버튼 — 샤프 코너 (borderRadius 6) */}
          {Platform.OS === 'web' ? (
            <div
              onClick={loading ? undefined : handleKakaoLogin}
              style={{
                backgroundColor: COLORS.special.kakao,
                borderRadius: BORDER_RADIUS.md,
                paddingTop: 16,
                paddingBottom: 16,
                paddingLeft: 20,
                paddingRight: 20,
                marginBottom: 16,
                cursor: loading ? 'default' : 'pointer',
                opacity: loading ? 0.5 : 1,
                boxShadow: CSS_SHADOWS.small,
                transition: 'transform 150ms ease, box-shadow 150ms ease',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = CSS_SHADOWS.medium;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = CSS_SHADOWS.small;
              }}
            >
              <View style={styles.kakaoButtonContent}>
                <View style={styles.kakaoLogo}>
                  <Text style={styles.kakaoLogoText}>K</Text>
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
                  <Text style={styles.kakaoLogoText}>K</Text>
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

          {/* 기능 소개 — 에디토리얼 넘버링 */}
          <FadeIn delay={200}>
            <View style={styles.featuresSection}>
              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: BORDER_RADIUS.md,
                    backgroundColor: COLORS.surface.secondary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 8,
                    border: `1px solid ${COLORS.neutral.grey100}`,
                  }}>
                    <Icon name="map-pin" size={20} color={COLORS.primary.accent} />
                  </div>
                  <Text style={styles.featureLabel}>내 주변 약속</Text>
                </View>
                <View style={styles.featureItem}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: BORDER_RADIUS.md,
                    backgroundColor: COLORS.surface.secondary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 8,
                    border: `1px solid ${COLORS.neutral.grey100}`,
                  }}>
                    <Icon name="users" size={20} color={COLORS.primary.accent} />
                  </div>
                  <Text style={styles.featureLabel}>새로운 인연</Text>
                </View>
                <View style={styles.featureItem}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: BORDER_RADIUS.md,
                    backgroundColor: COLORS.surface.secondary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 8,
                    border: `1px solid ${COLORS.neutral.grey100}`,
                  }}>
                    <Icon name="star" size={20} color={COLORS.primary.accent} />
                  </div>
                  <Text style={styles.featureLabel}>맞춤 추천</Text>
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
        <Text style={styles.footerText}>© 2025 잇테이블</Text>
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
    backgroundImage: COLORS.gradient.heroCSS,
  },
  logoSection: {
    alignItems: 'center',
    paddingTop: 72,
    paddingBottom: 28,
    zIndex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  appName: {
    fontSize: 32,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.text.white,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: FONT_WEIGHTS.regular as any,
    textAlign: 'center',
  },
  mainContainer: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
    zIndex: 1,
    marginTop: -8,
  },
  loginCard: {
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
    backgroundColor: COLORS.neutral.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: 28,
    paddingTop: 32,
    paddingBottom: 28,
    border: `1px solid rgba(17,17,17,0.06)`,
    boxSizing: 'border-box',
    ...SHADOWS.large,
    // @ts-ignore — web CSS shadow
    boxShadow: CSS_SHADOWS.large,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.text.primary,
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  loginSubtitle: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  kakaoButton: {
    backgroundColor: COLORS.special.kakao,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
    ...SHADOWS.small,
  },
  kakaoButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kakaoLogo: {
    width: 22,
    height: 22,
    backgroundColor: COLORS.special.kakaoBrown,
    borderRadius: BORDER_RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  kakaoLogoText: {
    color: COLORS.special.kakao,
    fontSize: 12,
    fontWeight: FONT_WEIGHTS.bold as any,
  },
  kakaoButtonText: {
    color: COLORS.special.kakaoBrown,
    fontSize: 16,
    fontWeight: FONT_WEIGHTS.semiBold as any,
    letterSpacing: -0.3,
  },
  disabledButton: {
    opacity: 0.5,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.neutral.grey100,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
    color: COLORS.text.tertiary,
    fontWeight: FONT_WEIGHTS.regular as any,
  },
  testLoginSection: {
    marginBottom: 20,
  },
  testLoginTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.tertiary,
    marginBottom: 10,
    textAlign: 'center',
  },
  testButtonsContainer: {
    gap: 6,
  },
  testButton: {
    backgroundColor: COLORS.surface.secondary,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
    borderRadius: BORDER_RADIUS.md,
    padding: 12,
    alignItems: 'center',
  },
  testButtonText: {
    color: COLORS.text.secondary,
    fontSize: 13,
    fontWeight: FONT_WEIGHTS.medium as any,
  },
  featuresSection: {
    marginBottom: 20,
    paddingTop: 4,
  },
  featuresList: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  featureItem: {
    alignItems: 'center',
    width: 80,
  },
  featureLabel: {
    fontSize: 12,
    fontWeight: FONT_WEIGHTS.medium as any,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },
  policyContainer: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  policyText: {
    fontSize: 11,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
  policyLink: {
    color: COLORS.primary.accent,
    fontWeight: FONT_WEIGHTS.medium as any,
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
  },
});

export default LoginScreen;
