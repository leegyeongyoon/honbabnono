import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Divider,
  Alert,
  Snackbar,
  CircularProgress,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import axios from 'axios';

interface SystemSettings {
  maintenanceMode: boolean;
  allowNewSignups: boolean;
  maxMeetupParticipants: number;
  meetupCreationCooldown: number;
  autoApprovalEnabled: boolean;
  emailNotificationsEnabled: boolean;
  smsNotificationsEnabled: boolean;
  depositAmount: number;
  platformFee: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>({
    maintenanceMode: false,
    allowNewSignups: true,
    maxMeetupParticipants: 4,
    meetupCreationCooldown: 60,
    autoApprovalEnabled: true,
    emailNotificationsEnabled: true,
    smsNotificationsEnabled: false,
    depositAmount: 3000,
    platformFee: 0,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const getAuthHeader = () => {
    const token = localStorage.getItem('adminToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3001/api/admin/settings', {
        headers: getAuthHeader(),
      });
      
      const data = response.data as ApiResponse<SystemSettings>;
      if (data.success) {
        setSettings(data.data);
      }
    } catch (error) {
      console.error('설정 로드 실패:', error);
      setSnackbar({
        open: true,
        message: '설정을 불러오는데 실패했습니다.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSettingChange = (key: keyof SystemSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const response = await axios.put('http://localhost:3001/api/admin/settings', settings, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
      });

      const data = response.data as ApiResponse<SystemSettings>;
      if (data.success) {
        setSnackbar({
          open: true,
          message: data.message || '설정이 성공적으로 저장되었습니다.',
          severity: 'success',
        });
      }
    } catch (error: any) {
      console.error('설정 저장 실패:', error);
      const errorMessage = error.response?.data?.error || '설정 저장에 실패했습니다.';
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        설정
      </Typography>

      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, 
        gap: 3 
      }}>
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                시스템 설정
              </Typography>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.maintenanceMode}
                    onChange={(e) => handleSettingChange('maintenanceMode', e.target.checked)}
                  />
                }
                label="유지보수 모드"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.allowNewSignups}
                    onChange={(e) => handleSettingChange('allowNewSignups', e.target.checked)}
                  />
                }
                label="신규 회원가입 허용"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoApprovalEnabled}
                    onChange={(e) => handleSettingChange('autoApprovalEnabled', e.target.checked)}
                  />
                }
                label="모임 자동 승인"
              />

              <Divider sx={{ my: 2 }} />

              <TextField
                label="최대 모임 참가자 수"
                type="number"
                value={settings.maxMeetupParticipants}
                onChange={(e) => handleSettingChange('maxMeetupParticipants', parseInt(e.target.value))}
                fullWidth
                margin="normal"
              />
              
              <TextField
                label="모임 생성 쿨다운 (분)"
                type="number"
                value={settings.meetupCreationCooldown}
                onChange={(e) => handleSettingChange('meetupCreationCooldown', parseInt(e.target.value))}
                fullWidth
                margin="normal"
              />
            </CardContent>
          </Card>
        </Box>

        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                알림 설정
              </Typography>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.emailNotificationsEnabled}
                    onChange={(e) => handleSettingChange('emailNotificationsEnabled', e.target.checked)}
                  />
                }
                label="이메일 알림 활성화"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.smsNotificationsEnabled}
                    onChange={(e) => handleSettingChange('smsNotificationsEnabled', e.target.checked)}
                  />
                }
                label="SMS 알림 활성화"
              />
            </CardContent>
          </Card>

          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                결제 설정
              </Typography>
              
              <TextField
                label="예약금 (원)"
                type="number"
                value={settings.depositAmount}
                onChange={(e) => handleSettingChange('depositAmount', parseInt(e.target.value))}
                fullWidth
                margin="normal"
              />
              
              <TextField
                label="플랫폼 수수료 (원)"
                type="number"
                value={settings.platformFee}
                onChange={(e) => handleSettingChange('platformFee', parseInt(e.target.value))}
                fullWidth
                margin="normal"
              />
            </CardContent>
          </Card>
        </Box>
      </Box>

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          onClick={saveSettings}
          disabled={saving}
          sx={{ 
            backgroundColor: '#C9B59C',
            '&:hover': {
              backgroundColor: '#A08B7A',
            },
            '&:disabled': {
              backgroundColor: '#D9CFC7',
            },
          }}
        >
          {saving ? '저장 중...' : '설정 저장'}
        </Button>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Settings;