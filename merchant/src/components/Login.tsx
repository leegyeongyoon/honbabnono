import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import apiClient from '../utils/api';

interface LoginProps {
  onLoginSuccess: (token: string, merchantData: any) => void;
  onNeedRegister?: (token: string, status?: string) => void;
  onGoSignup?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, onNeedRegister, onGoSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. 로그인
      const loginRes = await apiClient.post('/api/auth/login', { email, password });
      const accessToken = loginRes.data.accessToken || loginRes.data.token;

      if (!accessToken) {
        setError('로그인 응답에 토큰이 없습니다.');
        setLoading(false);
        return;
      }

      localStorage.setItem('merchantToken', accessToken);

      // 2. 점주 정보 조회
      try {
        const merchantRes = await apiClient.get('/api/merchants/me');
        const merchantInfo = merchantRes.data.data || merchantRes.data;

        if (!merchantInfo || !merchantInfo.id) {
          localStorage.removeItem('merchantToken');
          if (onNeedRegister) {
            onNeedRegister(accessToken);
          } else {
            setError('점주 등록이 필요합니다.');
          }
          setLoading(false);
          return;
        }

        if (merchantInfo.verification_status !== 'verified') {
          localStorage.removeItem('merchantToken');
          if (onNeedRegister) {
            onNeedRegister(accessToken, merchantInfo.verification_status);
          } else {
            setError(`사업자 인증 대기 중입니다. (현재 상태: ${merchantInfo.verification_status || '미인증'})`);
          }
          setLoading(false);
          return;
        }

        localStorage.setItem('merchantData', JSON.stringify(merchantInfo));
        onLoginSuccess(accessToken, merchantInfo);
      } catch (merchantErr: any) {
        localStorage.removeItem('merchantToken');
        if (merchantErr.response?.status === 404) {
          if (onNeedRegister) {
            onNeedRegister(accessToken);
          } else {
            setError('점주 등록이 필요합니다.');
          }
        } else {
          setError('점주 정보를 불러올 수 없습니다.');
        }
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: 'background.default',
      }}
    >
      <Card
        sx={{
          width: '100%',
          maxWidth: 420,
          mx: 2,
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, color: 'custom.brand', mb: 0.5 }}
            >
              잇테이블
            </Typography>
            <Typography variant="body1" color="text.secondary">
              점주 대시보드
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3, whiteSpace: 'pre-line' }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="이메일"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              sx={{ mb: 2 }}
              autoComplete="email"
            />
            <TextField
              fullWidth
              label="비밀번호"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              sx={{ mb: 3 }}
              autoComplete="current-password"
            />
            <Button
              fullWidth
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              disabled={loading || !email || !password}
              sx={{ py: 1.5, fontSize: '1rem' }}
            >
              {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : '로그인'}
            </Button>
          </Box>

          <Box sx={{ textAlign: 'center', mt: 2.5 }}>
            <Typography variant="body2" color="text.secondary">
              아직 계정이 없으신가요?{' '}
              {onGoSignup ? (
                <Button
                  variant="text"
                  color="primary"
                  onClick={onGoSignup}
                  sx={{ fontWeight: 600, p: 0, minWidth: 'auto' }}
                >
                  회원가입
                </Button>
              ) : (
                <Box component="span" sx={{ color: 'primary.dark', fontWeight: 600 }}>회원가입</Box>
              )}
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
              점주 회원가입 후 사업자 인증을 진행합니다.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
