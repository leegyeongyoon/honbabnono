import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS, SHADOWS, CTA_STYLE } from '../../styles/colors';
import { SPACING, BORDER_RADIUS } from '../../styles/spacing';
import { TYPOGRAPHY, FONT_WEIGHTS } from '../../styles/typography';
import apiClient, { API_HOSTS } from '../../services/apiClient';
import { Icon } from '../Icon';

interface UniversalLoginScreenProps {
  navigation?: any; // For native
  onNavigate?: (screen: string, params?: any) => void; // For custom navigation
  onLogin?: (userData: any) => void; // For login success callback
}

const UniversalLoginScreen: React.FC<UniversalLoginScreenProps> = ({
  navigation,
  onNavigate,
  onLogin
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Web-specific OAuth result handling
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
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
        Alert.alert('환영합니다!', '카카오 로그인이 완료되었습니다.');

        if (onLogin && userParam) {
          try {
            const userData = JSON.parse(decodeURIComponent(userParam));
            onLogin(userData);
          } catch (_e) {
            // Failed to parse user data
          }
        }

        // Navigate to home or callback
        if (onNavigate) {
          onNavigate('Home');
        } else {
          window.location.href = '/';
        }
      } else if (error) {
        const errorMessages: { [key: string]: string } = {
          'kakao_auth_failed': '카카오 인증에 실패했습니다.',
          'no_auth_code': '인증 코드를 받지 못했습니다.',
          'kakao_login_failed': '카카오 로그인 처리에 실패했습니다.'
        };
        Alert.alert('로그인 실패', errorMessages[error] || '알 수 없는 오류가 발생했습니다.');
      }
    }
  }, [onLogin, onNavigate]);

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('오류', '이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      // Email/Password login logic
      const response = await apiClient.post('/auth/login', {
        email,
        password
      });

      if (response.data) {
        const { token, user } = response.data;

        // Store credentials (universal storage)
        if (Platform.OS === 'web') {
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
        } else {
          // React Native - storage는 이미 userStore에서 처리됨
        }

        Alert.alert('성공', '로그인되었습니다.');

        if (onLogin) {
          onLogin(user, token);
        }

        // AuthNavigator가 자동으로 리다이렉트하므로 여기서는 따로 navigate하지 않음
      }
    } catch (_error) {
      Alert.alert('오류', '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleKakaoLogin = () => {
    setLoading(true);
    const kakaoAuthUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/auth/kakao`;

    if (Platform.OS === 'web') {
      window.location.href = kakaoAuthUrl;
    } else {
      // React Native - WebView로 카카오 OAuth 처리
      if (navigation?.navigate) {
        navigation.navigate('KakaoLoginWebView');
      } else {
        Alert.alert('알림', '카카오 로그인을 사용할 수 없습니다.');
      }
      setLoading(false);
    }
  };

  const handleQuickLogin = async () => {
    setLoading(true);
    try {
      // React Native에서는 실제 IP 사용
      const apiUrl = Platform.OS === 'web'
        ? (process.env.REACT_APP_API_URL || 'http://localhost:3001/api')
        : `http://${API_HOSTS[0]}:3001/api`;
      const response = await fetch(`${apiUrl}/auth/test-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: 'test1@test.com' }),
      });

      if (response.ok) {
        const data = await response.json();

        if (Platform.OS === 'web') {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
        }

        Alert.alert('빠른 로그인 성공!', `${data.user.name}으로 로그인되었습니다.`);

        if (onLogin) {
          onLogin(data.user, data.token);
        }

        // AuthNavigator가 자동으로 리다이렉트하므로 여기서는 따로 navigate하지 않음
      } else {
        Alert.alert('로그인 실패', '빠른 테스트 로그인에 실패했습니다.');
      }
    } catch (error) {
      Alert.alert('로그인 실패', '서버 연결에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestLogin = async (email: string, name: string) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/auth/test-login', { email });

      if (response.data) {
        if (Platform.OS === 'web') {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }

        Alert.alert('테스트 로그인 성공!', `${name}으로 로그인되었습니다.`);

        if (onLogin) {
          onLogin(response.data.user, response.data.token);
        }

        // AuthNavigator가 자동으로 리다이렉트하므로 여기서는 따로 navigate하지 않음
      } else {
        Alert.alert('로그인 실패', '테스트 로그인에 실패했습니다.');
      }
    } catch (_error) {
      Alert.alert('로그인 실패', '서버 연결에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 배경 — 그라데이션 */}
      {Platform.OS === 'web' ? (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '100%',
          background: 'linear-gradient(135deg, #A88068 0%, #C4A08A 50%, #D8BCA8 100%)',
        }} />
      ) : (
        <LinearGradient
          colors={['#A88068', '#C4A08A', '#D8BCA8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.backgroundGradient}
        />
      )}

      {/* 로고 섹션 */}
      <View style={styles.logoSection}>
        <View style={styles.logoContainer}>
          <View style={styles.logoMark}>
            <Text style={styles.logoMarkText}>E</Text>
          </View>
          <Text style={styles.appName}>잇테이블</Text>
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
            <Text style={styles.welcomeText}>환영합니다</Text>
            <Text style={styles.loginSubtitle}>카카오 계정으로 간편하게 시작하세요</Text>
          </View>

          {/* 카카오 로그인 버튼 — 샤프 코너 */}
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

          {/* 구분선 */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>또는</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email/Password Login (if needed) */}
          {Platform.OS !== 'web' && (
            <>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="이메일"
                  placeholderTextColor={COLORS.neutral.grey400}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="비밀번호"
                  placeholderTextColor={COLORS.neutral.grey400}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="password"
                />
              </View>

              <TouchableOpacity
                style={[styles.loginButton, loading && styles.disabledButton]}
                onPress={handleEmailLogin}
                disabled={loading}
              >
                <Text style={styles.loginButtonText}>
                  {loading ? '로그인 중...' : '로그인'}
                </Text>
              </TouchableOpacity>

              <View style={styles.linkContainer}>
                <TouchableOpacity>
                  <Text style={styles.linkText}>비밀번호 찾기</Text>
                </TouchableOpacity>
                <Text style={styles.separator}>|</Text>
                <TouchableOpacity>
                  <Text style={styles.linkText}>회원가입</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* 테스트 로그인 버튼들 (Web enhanced) */}
          {Platform.OS === 'web' && (
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
          )}

          {/* 기능 소개 — 3열 아이콘 그리드 */}
          <View style={styles.featuresSection}>
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <View style={styles.featureIconBox}>
                  <Icon name="map-pin" size={20} color={COLORS.primary.accent} />
                </View>
                <Text style={styles.featureLabel}>내 주변 모임</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={styles.featureIconBox}>
                  <Icon name="users" size={20} color={COLORS.primary.accent} />
                </View>
                <Text style={styles.featureLabel}>새로운 인연</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={styles.featureIconBox}>
                  <Icon name="star" size={20} color={COLORS.primary.accent} />
                </View>
                <Text style={styles.featureLabel}>맞춤 추천</Text>
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

      {/* 푸터 (Web enhanced) */}
      {Platform.OS === 'web' && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 잇테이블</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
    ...(Platform.OS === 'web' && { minHeight: '100vh' }),
    ...(Platform.OS !== 'web' && { justifyContent: 'center', padding: 20 }),
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  logoSection: {
    alignItems: 'center',
    zIndex: 1,
    ...(Platform.OS === 'web' && {
      paddingTop: 80,
      paddingBottom: 40,
    }),
    ...(Platform.OS !== 'web' && {
      paddingTop: 60,
      paddingBottom: 30,
    }),
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoMark: {
    width: Platform.OS === 'web' ? 72 : 56,
    height: Platform.OS === 'web' ? 72 : 56,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.primary.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...SHADOWS.cta,
  },
  logoMarkText: {
    fontSize: Platform.OS === 'web' ? 32 : 24,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.neutral.white,
    letterSpacing: -1,
  },
  appName: {
    fontSize: Platform.OS === 'web' ? 40 : 28,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.text.white,
    letterSpacing: -0.8,
  },
  tagline: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: FONT_WEIGHTS.medium as any,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 22,
  },
  mainContainer: {
    flex: 1,
    paddingHorizontal: 20,
    zIndex: 1,
    ...(Platform.OS === 'web' && {
      justifyContent: 'center',
      marginTop: -20,
    }),
  },
  loginCard: {
    maxWidth: Platform.OS === 'web' ? 420 : 400,
    alignSelf: 'center',
    width: '100%',
    backgroundColor: COLORS.neutral.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: Platform.OS === 'web' ? 36 : 28,
    ...SHADOWS.large,
    ...(Platform.OS === 'web' && {
      borderWidth: 1,
      borderColor: 'rgba(17,17,17,0.06)',
    }),
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  welcomeText: {
    fontSize: Platform.OS === 'web' ? 26 : 22,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.text.primary,
    marginBottom: 8,
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
    marginBottom: 24,
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
    marginRight: 10,
  },
  kakaoLogoText: {
    color: COLORS.special.kakao,
    fontSize: 12,
    fontWeight: FONT_WEIGHTS.bold as any,
  },
  kakaoButtonText: {
    color: COLORS.special.kakaoBrown,
    fontSize: Platform.OS === 'web' ? 16 : 15,
    fontWeight: FONT_WEIGHTS.semiBold as any,
    letterSpacing: -0.3,
  },
  disabledButton: {
    opacity: 0.5,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
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
  // Email/Password inputs for native
  inputContainer: {
    marginBottom: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
    borderRadius: BORDER_RADIUS.md,
    padding: 14,
    fontSize: 15,
    backgroundColor: COLORS.surface.secondary,
    color: COLORS.text.primary,
  },
  loginButton: {
    ...CTA_STYLE.primary,
    alignItems: 'center',
    marginBottom: 20,
    ...SHADOWS.cta,
  },
  loginButtonText: {
    color: COLORS.text.white,
    fontSize: 15,
    fontWeight: FONT_WEIGHTS.semiBold as any,
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  linkText: {
    color: COLORS.text.tertiary,
    fontSize: 13,
    fontWeight: FONT_WEIGHTS.medium as any,
  },
  separator: {
    marginHorizontal: 16,
    color: COLORS.neutral.grey300,
    fontSize: 13,
  },
  // Web-specific test login section
  testLoginSection: {
    marginBottom: 24,
  },
  testLoginTitle: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.tertiary,
    marginBottom: 12,
    textAlign: 'center',
  },
  testButtonsContainer: {
    gap: 8,
  },
  testButton: {
    backgroundColor: COLORS.surface.secondary,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
    borderRadius: BORDER_RADIUS.md,
    padding: 14,
    alignItems: 'center',
  },
  testButtonText: {
    color: COLORS.text.secondary,
    fontSize: 14,
    fontWeight: FONT_WEIGHTS.medium as any,
  },
  // 기능 소개 — 3열 아이콘 그리드
  featuresSection: {
    marginBottom: 24,
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
  featureIconBox: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
  },
  featureLabel: {
    fontSize: 12,
    fontWeight: FONT_WEIGHTS.medium as any,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },
  policyContainer: {
    paddingHorizontal: Platform.OS === 'web' ? 8 : 10,
    ...(Platform.OS !== 'web' && { marginTop: 24 }),
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
    ...(Platform.OS !== 'web' && { textDecorationLine: 'underline' }),
  },
  // Web-specific footer
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
});

export default UniversalLoginScreen;
