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
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import LogoutIcon from '@mui/icons-material/Logout';
import apiClient from '../utils/api';

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];
const DAY_VALUES = [1, 2, 3, 4, 5, 6, 0]; // DB 요일 값 (0=일, 1=월, ...)

interface TimeSlot {
  id?: number;
  day_of_week: number;
  slot_time: string;
  max_reservations: number;
}

interface OrderSettings {
  autoAcceptOrders: boolean;
  defaultPrepTime: number;
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

  // 주문 자동접수 설정
  const [orderSettings, setOrderSettings] = useState<OrderSettings>({
    autoAcceptOrders: false,
    defaultPrepTime: 20,
  });
  const [orderSettingsLoading, setOrderSettingsLoading] = useState(false);

  // 알림 설정
  const [notifications, setNotifications] = useState<NotificationSettings>(defaultNotifications());

  // 시간 슬롯
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [newSlotMax, setNewSlotMax] = useState(4);
  const [customTime, setCustomTime] = useState('');

  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const merchantData = JSON.parse(localStorage.getItem('merchantData') || '{}');
  const restaurantId = merchantData.restaurant_id || merchantData.restaurantId;

  useEffect(() => {
    loadUserInfo();
    loadNotificationSettings();
    loadTimeSlots();
    loadOrderSettings();
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
      const raw = res.data.data || res.data;
      const slots = raw.timeSlots || raw.time_slots || (Array.isArray(raw) ? raw : []);
      setTimeSlots(Array.isArray(slots) ? slots : []);
    } catch {
      // 시간 슬롯 로드 실패 시 기본값 사용
    } finally {
      setSlotsLoading(false);
    }
  };

  const loadOrderSettings = async () => {
    if (!restaurantId) return;
    try {
      const res = await apiClient.get(`/api/restaurants/${restaurantId}`);
      const raw = res.data.data || res.data;
      const d = raw.restaurant || raw;
      setOrderSettings({
        autoAcceptOrders: d.auto_accept_orders || false,
        defaultPrepTime: d.default_prep_time || 20,
      });
    } catch (err: any) {
      // 에러 무시, 기본값 사용
    }
  };

  const handleSaveOrderSettings = async () => {
    if (!restaurantId) {
      setError('매장 ID를 찾을 수 없습니다.');
      return;
    }
    setOrderSettingsLoading(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.put(`/api/restaurants/${restaurantId}`, {
        auto_accept_orders: orderSettings.autoAcceptOrders,
        default_prep_time: orderSettings.defaultPrepTime,
      });
      setSuccess('주문 설정이 저장되었습니다.');
    } catch (err: any) {
      setError(err.response?.data?.message || '주문 설정 저장에 실패했습니다.');
    } finally {
      setOrderSettingsLoading(false);
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

  const PRESET_TIMES = [
    { label: '11:00', value: '11:00' },
    { label: '11:30', value: '11:30' },
    { label: '12:00', value: '12:00' },
    { label: '12:30', value: '12:30' },
    { label: '13:00', value: '13:00' },
    { label: '17:00', value: '17:00' },
    { label: '17:30', value: '17:30' },
    { label: '18:00', value: '18:00' },
    { label: '18:30', value: '18:30' },
    { label: '19:00', value: '19:00' },
    { label: '19:30', value: '19:30' },
    { label: '20:00', value: '20:00' },
    { label: '20:30', value: '20:30' },
  ];

  const toggleDay = (dayValue: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayValue) ? prev.filter((d) => d !== dayValue) : [...prev, dayValue]
    );
  };

  const toggleTime = (time: string) => {
    setSelectedTimes((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    );
  };

  const selectAllDays = () => {
    setSelectedDays(selectedDays.length === DAY_VALUES.length ? [] : [...DAY_VALUES]);
  };

  const selectLunchTimes = () => {
    const lunch = ['11:00', '11:30', '12:00', '12:30', '13:00'];
    const allSelected = lunch.every((t) => selectedTimes.includes(t));
    setSelectedTimes((prev) => {
      if (allSelected) return prev.filter((t) => !lunch.includes(t));
      const merged = prev.concat(lunch.filter((t) => !prev.includes(t)));
      return merged;
    });
  };

  const selectDinnerTimes = () => {
    const dinner = ['17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'];
    const allSelected = dinner.every((t) => selectedTimes.includes(t));
    setSelectedTimes((prev) => {
      if (allSelected) return prev.filter((t) => !dinner.includes(t));
      const merged = prev.concat(dinner.filter((t) => !prev.includes(t)));
      return merged;
    });
  };

  const handleAddCustomTime = () => {
    if (!customTime) return;
    if (!selectedTimes.includes(customTime)) {
      setSelectedTimes((prev) => [...prev, customTime].sort());
    }
    setCustomTime('');
  };

  const handleBulkAddSlots = async () => {
    if (!restaurantId) {
      setError('매장 ID를 찾을 수 없습니다.');
      return;
    }
    if (selectedDays.length === 0) {
      setError('요일을 선택해주세요.');
      return;
    }
    if (selectedTimes.length === 0) {
      setError('시간을 선택해주세요.');
      return;
    }
    setError('');
    setSlotsLoading(true);
    try {
      const requests = [];
      for (const day of selectedDays) {
        for (const time of selectedTimes) {
          requests.push(
            apiClient.post(`/api/restaurants/${restaurantId}/time-slots`, {
              day_of_week: day,
              slot_time: time,
              max_reservations: newSlotMax,
            })
          );
        }
      }
      await Promise.all(requests);
      const count = selectedDays.length * selectedTimes.length;
      setSuccess(`${count}개 시간 슬롯이 생성되었습니다.`);
      setSelectedDays([]);
      setSelectedTimes([]);
      loadTimeSlots();
    } catch (err: any) {
      setError(err.response?.data?.message || '시간 슬롯 추가에 실패했습니다.');
    } finally {
      setSlotsLoading(false);
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
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="이름" value={userName} disabled />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="이메일" value={userEmail} disabled />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>비밀번호 변경</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                type="password"
                label="현재 비밀번호"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                type="password"
                label="새 비밀번호"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
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

      {/* 주문 자동접수 설정 */}
      <Card sx={{ mb: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>주문 설정</Typography>
          <FormControlLabel
            control={
              <Switch
                checked={orderSettings.autoAcceptOrders}
                onChange={() =>
                  setOrderSettings((prev) => ({
                    ...prev,
                    autoAcceptOrders: !prev.autoAcceptOrders,
                  }))
                }
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: '#C4A08A' },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#C4A08A' },
                }}
              />
            }
            label="주문 자동접수"
            sx={{ display: 'block', mb: 2 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            활성화하면 새 주문이 자동으로 접수(준비중) 상태로 전환됩니다.
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="number"
                label="기본 조리시간 (분)"
                value={orderSettings.defaultPrepTime}
                onChange={(e) =>
                  setOrderSettings((prev) => ({
                    ...prev,
                    defaultPrepTime: Math.max(1, parseInt(e.target.value) || 1),
                  }))
                }
                inputProps={{ min: 1, max: 120 }}
                helperText="주문 접수 시 고객에게 표시되는 예상 조리시간"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Button
                variant="contained"
                onClick={handleSaveOrderSettings}
                disabled={orderSettingsLoading}
                sx={{
                  py: 1.5,
                  background: 'linear-gradient(135deg, #C4A08A 0%, #D8BCA8 100%)',
                  '&:hover': { background: 'linear-gradient(135deg, #A88068 0%, #C4A08A 100%)' },
                }}
              >
                {orderSettingsLoading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : '주문 설정 저장'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 시간 슬롯 관리 */}
      <Card sx={{ mb: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>예약 시간 슬롯 관리</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            고객이 예약할 수 있는 요일과 시간을 선택하세요. 선택한 요일 × 시간 조합으로 슬롯이 생성됩니다.
          </Typography>

          {/* 1. 요일 선택 */}
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>요일 선택</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
            {DAYS.map((day, idx) => {
              const val = DAY_VALUES[idx];
              const isSelected = selectedDays.includes(val);
              return (
                <Chip
                  key={day}
                  label={day}
                  onClick={() => toggleDay(val)}
                  variant={isSelected ? 'filled' : 'outlined'}
                  sx={{
                    fontWeight: 600,
                    fontSize: 14,
                    px: 1,
                    ...(isSelected
                      ? { backgroundColor: '#C4A08A', color: '#fff', '&:hover': { backgroundColor: '#A88068' } }
                      : { borderColor: '#C4A08A', color: '#C4A08A', '&:hover': { backgroundColor: 'rgba(196,160,138,0.08)' } }),
                  }}
                />
              );
            })}
          </Box>
          <Box sx={{ mb: 3 }}>
            <Button size="small" onClick={selectAllDays} sx={{ color: '#C4A08A', textTransform: 'none', fontSize: 12 }}>
              {selectedDays.length === DAY_VALUES.length ? '전체 해제' : '전체 선택'}
            </Button>
          </Box>

          {/* 2. 시간 선택 */}
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>시간 선택</Typography>
          <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
            <Button size="small" onClick={selectLunchTimes} sx={{ color: '#C4A08A', textTransform: 'none', fontSize: 12 }}>
              점심 일괄
            </Button>
            <Button size="small" onClick={selectDinnerTimes} sx={{ color: '#C4A08A', textTransform: 'none', fontSize: 12 }}>
              저녁 일괄
            </Button>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            {PRESET_TIMES.map((t) => {
              const isSelected = selectedTimes.includes(t.value);
              return (
                <Chip
                  key={t.value}
                  label={t.label}
                  onClick={() => toggleTime(t.value)}
                  variant={isSelected ? 'filled' : 'outlined'}
                  size="small"
                  sx={{
                    fontWeight: 500,
                    ...(isSelected
                      ? { backgroundColor: '#C4A08A', color: '#fff', '&:hover': { backgroundColor: '#A88068' } }
                      : { borderColor: 'rgba(0,0,0,0.2)', '&:hover': { backgroundColor: 'rgba(196,160,138,0.08)' } }),
                  }}
                />
              );
            })}
          </Box>
          {/* 직접 입력 */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 3 }}>
            <TextField
              type="time"
              size="small"
              label="직접 입력"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 160 }}
            />
            <Button
              size="small"
              variant="outlined"
              onClick={handleAddCustomTime}
              disabled={!customTime}
              sx={{ borderColor: '#C4A08A', color: '#C4A08A' }}
            >
              추가
            </Button>
          </Box>

          {/* 3. 최대 예약 수 + 생성 버튼 */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3 }}>
            <TextField
              type="number"
              size="small"
              label="슬롯당 최대 예약 수"
              value={newSlotMax}
              onChange={(e) => setNewSlotMax(Math.max(1, parseInt(e.target.value) || 1))}
              inputProps={{ min: 1 }}
              sx={{ width: 180 }}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleBulkAddSlots}
              disabled={slotsLoading || selectedDays.length === 0 || selectedTimes.length === 0}
              sx={{
                px: 3,
                background: 'linear-gradient(135deg, #C4A08A 0%, #D8BCA8 100%)',
                '&:hover': { background: 'linear-gradient(135deg, #A88068 0%, #C4A08A 100%)' },
                '&.Mui-disabled': { background: '#e0e0e0' },
              }}
            >
              {slotsLoading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> :
                `${selectedDays.length} × ${selectedTimes.length} = ${selectedDays.length * selectedTimes.length}개 슬롯 생성`}
            </Button>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* 현재 등록된 슬롯 목록 */}
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            등록된 슬롯 ({timeSlots.length}개)
          </Typography>
          {slotsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress sx={{ color: '#C4A08A' }} size={28} />
            </Box>
          ) : timeSlots.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
              등록된 시간 슬롯이 없습니다. 위에서 요일과 시간을 선택하여 생성하세요.
            </Typography>
          ) : (
            (() => {
              // 요일별로 그룹화해서 표시
              const grouped: Record<number, TimeSlot[]> = {};
              timeSlots.forEach((slot) => {
                if (!grouped[slot.day_of_week]) grouped[slot.day_of_week] = [];
                grouped[slot.day_of_week].push(slot);
              });
              const sortedDays = Object.keys(grouped).map(Number).sort((a, b) => {
                const order = [1, 2, 3, 4, 5, 6, 0];
                return order.indexOf(a) - order.indexOf(b);
              });

              return (
                <Box>
                  {sortedDays.map((dayVal) => (
                    <Box key={dayVal} sx={{ mb: 2 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: 14, mb: 0.5, color: '#333' }}>
                        {getDayLabel(dayVal)}요일
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {grouped[dayVal]
                          .sort((a, b) => a.slot_time.localeCompare(b.slot_time))
                          .map((slot) => (
                            <Chip
                              key={slot.id}
                              label={`${String(slot.slot_time).slice(0, 5)} (${slot.max_reservations}팀)`}
                              onDelete={slot.id ? () => handleDeleteSlot(slot.id!) : undefined}
                              size="small"
                              sx={{
                                backgroundColor: 'rgba(196,160,138,0.1)',
                                '& .MuiChip-deleteIcon': { color: '#D32F2F', fontSize: 16 },
                              }}
                            />
                          ))}
                      </Box>
                    </Box>
                  ))}
                </Box>
              );
            })()
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
