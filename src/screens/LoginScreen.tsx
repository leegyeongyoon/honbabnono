import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {COLORS, SHADOWS} from '../styles/colors';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('오류', '이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      // TODO: 실제 로그인 API 호출
      console.log('Login attempt:', { email, password });
      
      // 임시로 성공 처리
      Alert.alert('성공', '로그인되었습니다.');
      // navigation.navigate('Home');
    } catch (error) {
      Alert.alert('오류', '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleKakaoLogin = async () => {
    setLoading(true);
    try {
      // Kakao OAuth2 로그인 URL로 리다이렉트
      const kakaoAuthUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/auth/kakao`;
      
      if (Platform.OS === 'web') {
        window.location.href = kakaoAuthUrl;
      } else {
        // React Native에서는 WebView나 인앱 브라우저 사용 필요
        console.log('Redirect to:', kakaoAuthUrl);
        Alert.alert('알림', '카카오 로그인 기능은 웹에서 지원됩니다.');
      }
    } catch (error) {
      Alert.alert('오류', '카카오 로그인에 실패했습니다.');
    } finally {
      setLoading(false);
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