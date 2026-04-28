import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import LogoutIcon from '@mui/icons-material/Logout';
import apiClient from '../utils/api';

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];
const DAY_VALUES = [1, 2, 3, 4, 5, 6, 0]; // DB 요일 값 (0=일, 1=월, ...)

interface TimeSlot {
  id?: number;
  day_of_week: number;
  time: string;
  max_reservations: number;
}

interface NotificationSettings {
  newReservation: boolean;
  customerArrival: boolean;
  noShow: boolean;
}

const NOTIFICATION_STORAGE_KEY = 'merchantNotificationSettings';

const defaultNotifications = (): NotificationSettings => ({
  newReservation: true,
  customerArrival: true,
  noShow: true,
});

const MerchantSettings: React.FC = () => {
  // 내 정보
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');

  // 비밀번호 변경
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // 알림 설정
  const [notifications, setNotifications] = useState<NotificationSettings>(defaultNotifications());

  // 시간 슬롯
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [newSlotDay, setNewSlotDay] = useState<number>(1);
  const [newSlotTime, setNewSlotTime] = useState('12:00');
  const [newSlotMax, setNewSlotMax] = useState(4);

  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const merchantData = JSON.parse(localStorage.getItem('merchantData') || '{}');
  const restaurantId = merchantData.restaurant_id || merchantData.restaurantId;

  useEffect(() => {
    loadUserInfo();
    loadNotificationSettings();
    loadTimeSlots();
  }, []);

  const loadUserInfo = () => {
    const data = JSON.parse(localStorage.getItem('merchantData') || '{}');
    setUserName(data.representative_name || data.username || data.name || '');
    setUserEmail(data.email || '');
  };

  const loadNotificationSettings = () => {
    try {
      const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
      if (stored) {
        setNotifications(JSON.parse(stored));
      }
    } catch {
      // 기본값 사용
    }
  };

  const loadTimeSlots = async () => {
    if (!restaurantId) return;
    setSlotsLoading(true);
    try {
      const res = await apiClient.get(`/api/restaurants/${restaurantId}/time-slots`);
      const slots = res.data.timeSlots || res.data.time_slots || res.data || [];
      setTimeSlots(Array.isArray(slots) ? slots : []);
    } catch (err: any) {
      console.error('시간 슬롯 로드 실패:', err);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    setError('');
    setSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('모든 비밀번호 필드를 입력해주세요.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    if (newPassword.length < 6) {
      setError('새 비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    setPasswordLoading(true);
    try {
      await apiClient.put('/api/user/password', {
        currentPassword,
        newPassword,
      });
      setSuccess('비밀번호가 변경되었습니다.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.response?.data?.message || '비밀번호 변경에 실패했습니다.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleNotificationChange = (key: keyof NotificationSettings) => {
    setNotifications((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleAddSlot = async () => {
    if (!restaurantId) {
      setError('매장 ID를 찾을 수 없습니다.');
      return;
    }
    setError('');
    try {
      await apiClient.post(`/api/restaurants/${restaurantId}/time-slots`, {
        day_of_week: newSlotDay,
        time: newSlotTime,
        max_reservations: newSlotMax,
      });
      setSuccess('시간 슬롯이 추가되었습니다.');
      loadTimeSlots();
    } catch (err: any) {
      setError(err.response?.data?.message || '시간 슬롯 추가에 실패했습니다.');
    }
  };

  const handleDeleteSlot = async (slotId: number) => {
    if (!restaurantId || !slotId) return;
    setError('');
    try {
      await apiClient.delete(`/api/restaurants/${restaurantId}/time-slots/${slotId}`);
      setSuccess('시간 슬롯이 삭제되었습니다.');
      setTimeSlots((prev) => prev.filter((s) => s.id !== slotId));
    } catch (err: any) {
      setError(err.response?.data?.message || '시간 슬롯 삭제에 실패했습니다.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('merchantToken');
    localStorage.removeItem('merchantData');
    window.location.href = '/';
  };

  const getDayLabel = (dayValue: number) => {
    const idx = DAY_VALUES.indexOf(dayValue);
    return idx >= 0 ? DAYS[idx] : `${dayValue}`;
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        설정
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* 내 정보 */}
      <Card sx={{ mb: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>내 정보</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="이름" value={userName} disabled />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="이메일" value={userEmail} disabled />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>비밀번호 변경</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="password"
                label="현재 비밀번호"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="password"
                label="새 비밀번호"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="password"
                label="새 비밀번호 확인"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </Grid>
          </Grid>
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              onClick={handlePasswordChange}
              disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
              sx={{
                background: 'linear-gradient(135deg, #C4A08A 0%, #D8BCA8 100%)',
                '&:hover': { background: 'linear-gradient(135deg, #A88068 0%, #C4A08A 100%)' },
              }}
            >
              {passwordLoading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : '비밀번호 변경'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 알림 설정 */}
      <Card sx={{ mb: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>알림 설정</Typography>
          <FormControlLabel
            control={
              <Switch
                checked={notifications.newReservation}
                onChange={() => handleNotificationChange('newReservation')}
                sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#C4A08A' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#C4A08A' } }}
              />
            }
            label="새 예약 알림"
            sx={{ display: 'block', mb: 1 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={notifications.customerArrival}
                onChange={() => handleNotificationChange('customerArrival')}
                sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#C4A08A' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#C4A08A' } }}
              />
            }
            label="고객 도착 알림"
            sx={{ display: 'block', mb: 1 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={notifications.noShow}
                onChange={() => handleNotificationChange('noShow')}
                sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#C4A08A' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#C4A08A' } }}
              />
            }
            label="노쇼 알림"
            sx={{ display: 'block' }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            알림 설정은 현재 기기에 저장됩니다. 추후 서버 연동 예정입니다.
          </Typography>
        </CardContent>
      </Card>

      {/* 시간 슬롯 관리 */}
      <Card sx={{ mb: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>시간 슬롯 관리</Typography>

          {/* 슬롯 추가 */}
          <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>요일</InputLabel>
                <Select
                  value={newSlotDay}
                  label="요일"
                  onChange={(e) => setNewSlotDay(Number(e.target.value))}
                >
                  {DAYS.map((day, idx) => (
                    <MenuItem key={day} value={DAY_VALUES[idx]}>{day}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                type="time"
                label="시간"
                size="small"
                value={newSlotTime}
                onChange={(e) => setNewSlotTime(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                type="number"
                label="최대 예약 수"
                size="small"
                value={newSlotMax}
                onChange={(e) => setNewSlotMax(parseInt(e.target.value) || 1)}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddSlot}
                sx={{
                  background: 'linear-gradient(135deg, #C4A08A 0%, #D8BCA8 100%)',
                  '&:hover': { background: 'linear-gradient(135deg, #A88068 0%, #C4A08A 100%)' },
                }}
              >
                추가
              </Button>
            </Grid>
          </Grid>

          <Divider sx={{ mb: 2 }} />

          {/* 기존 슬롯 목록 */}
          {slotsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress sx={{ color: '#C4A08A' }} size={28} />
            </Box>
          ) : timeSlots.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
              등록된 시간 슬롯이 없습니다.
            </Typography>
          ) : (
            <List sx={{ p: 0 }}>
              {timeSlots.map((slot, idx) => (
                <ListItem
                  key={slot.id || idx}
                  sx={{
                    borderBottom: idx < timeSlots.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                    px: 0,
                  }}
                  secondaryAction={
                    slot.id ? (
                      <IconButton edge="end" onClick={() => handleDeleteSlot(slot.id!)} sx={{ color: '#D32F2F' }}>
                        <DeleteIcon />
                      </IconButton>
                    ) : null
                  }
                >
                  <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                    <Typography sx={{ fontWeight: 600, minWidth: 32 }}>
                      {getDayLabel(slot.day_of_week)}
                    </Typography>
                    <Typography>{slot.time}</Typography>
                    <Typography color="text.secondary">
                      최대 {slot.max_reservations}팀
                    </Typography>
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* 로그아웃 */}
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Button
          variant="contained"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          sx={{
            backgroundColor: '#D32F2F',
            px: 4,
            py: 1.5,
            fontWeight: 600,
            '&:hover': { backgroundColor: '#B71C1C' },
          }}
        >
          로그아웃
        </Button>
      </Box>
    </Box>
  );
};

export default MerchantSettings;
