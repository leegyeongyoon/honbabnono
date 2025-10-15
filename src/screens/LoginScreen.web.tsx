import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import {COLORS, SHADOWS} from '../styles/colors';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // URL에서 OAuth 결과 확인
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (code) {
      // 카카오 로그인 성공
      handleKakaoCallback(code);
    } else if (error) {
      Alert.alert('오류', '카카오 로그인이 취소되었습니다.');
    }
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('오류', '이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        Alert.alert('성공', '로그인되었습니다.');
        window.location.href = '/';
      } else {
        Alert.alert('오류', data.message || '로그인에 실패했습니다.');
      }
    } catch (error) {
      Alert.alert('오류', '네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleKakaoLogin = () => {
    const kakaoAuthUrl = `${process.env.REACT_APP_API_URL}/auth/kakao`;
    window.location.href = kakaoAuthUrl;
  };

  const handleKakaoCallback = async (code: string) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/kakao/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        Alert.alert('성공', '카카오 로그인이 완료되었습니다.');
        window.location.href = '/';
      } else {
        Alert.alert('오류', data.message || '카카오 로그인에 실패했습니다.');
      }
    } catch (error) {
      Alert.alert('오류', '카카오 로그인 처리 중 오류가 발생했습니다.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>혼밥시러</Text>
        <Text style={styles.subtitle}>로그인</Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="이메일"
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
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />
        </View>

        <TouchableOpacity
          style={[styles.loginButton, loading && styles.disabledButton]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.loginButtonText}>
            {loading ? '로그인 중...' : '로그인'}
          </Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>또는</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={[styles.kakaoButton, loading && styles.disabledButton]}
          onPress={handleKakaoLogin}
          disabled={loading}
        >
          <Text style={styles.kakaoButtonText}>카카오로 로그인</Text>
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

        <View style={styles.policyContainer}>
          <Text style={styles.policyText}>
            로그인 시 혼밥시러의{' '}
            <TouchableOpacity onPress={() => Alert.alert('이용약관', '이용약관 내용')}>
              <Text style={styles.policyLink}>이용약관</Text>
            </TouchableOpacity>
            {' '}및{' '}
            <TouchableOpacity onPress={() => Alert.alert('개인정보처리방침', '개인정보처리방침 내용')}>
              <Text style={styles.policyLink}>개인정보처리방침</Text>
            </TouchableOpacity>
            에 동의하게 됩니다.
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
    backgroundColor: COLORS.neutral.white,
    borderRadius: 16,
    padding: 30,
    ...SHADOWS.large,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: COLORS.primary.main,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 40,
    color: COLORS.text.secondary,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.primary.light,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: COLORS.secondary.light,
    color: COLORS.text.primary,
  },
  loginButton: {
    backgroundColor: COLORS.primary.main,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    ...SHADOWS.medium,
  },
  loginButtonText: {
    color: COLORS.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.neutral.grey300,
  },
  dividerText: {
    marginHorizontal: 16,
    color: COLORS.text.secondary,
    fontSize: 14,
  },
  kakaoButton: {
    backgroundColor: COLORS.functional.warning,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    ...SHADOWS.medium,
  },
  kakaoButtonText: {
    color: COLORS.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  linkText: {
    color: COLORS.primary.dark,
    fontSize: 14,
  },
  separator: {
    marginHorizontal: 16,
    color: COLORS.text.secondary,
    fontSize: 14,
  },
  policyContainer: {
    marginTop: 30,
    paddingHorizontal: 10,
  },
  policyText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  policyLink: {
    color: COLORS.primary.dark,
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
});

export default LoginScreen;