import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import apiClient from '../utils/api';

const CATEGORIES = [
  '샤브샤브', '고깃집', '전골찜', '훠궈', '코스요리',
  '한식', '중식', '일식', '양식', '기타',
];

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

interface OperatingHour {
  open: string;
  close: string;
}

interface StoreData {
  name: string;
  description: string;
  category: string;
  phone: string;
  address: string;
  address_detail: string;
  seat_count: number;
  image_url: string;
  operating_hours: Record<string, OperatingHour>;
}

interface MerchantInfo {
  business_number: string;
  representative_name: string;
  bank_name: string;
  bank_account: string;
  bank_holder: string;
}

const defaultOperatingHours = (): Record<string, OperatingHour> => {
  const hours: Record<string, OperatingHour> = {};
  DAY_KEYS.forEach((key) => {
    hours[key] = { open: '11:00', close: '22:00' };
  });
  return hours;
};

const StoreInfo: React.FC = () => {
  const [storeData, setStoreData] = useState<StoreData>({
    name: '',
    description: '',
    category: '',
    phone: '',
    address: '',
    address_detail: '',
    seat_count: 0,
    image_url: '',
    operating_hours: defaultOperatingHours(),
  });
  const [merchantInfo, setMerchantInfo] = useState<MerchantInfo>({
    business_number: '',
    representative_name: '',
    bank_name: '',
    bank_account: '',
    bank_holder: '',
  });
  const [editing, setEditing] = useState(false);
  const [editingBank, setEditingBank] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const merchantData = JSON.parse(localStorage.getItem('merchantData') || '{}');
  const restaurantId = merchantData.restaurant_id || merchantData.restaurantId;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [storeRes, merchantRes] = await Promise.all([
        restaurantId ? apiClient.get(`/api/restaurants/${restaurantId}`) : Promise.resolve(null),
        apiClient.get('/api/merchants/me'),
      ]);

      if (storeRes?.data) {
        const d = storeRes.data.restaurant || storeRes.data;
        setStoreData({
          name: d.name || '',
          description: d.description || '',
          category: d.category || '',
          phone: d.phone || '',
          address: d.address || '',
          address_detail: d.address_detail || '',
          seat_count: d.seat_count || 0,
          image_url: d.image_url || '',
          operating_hours: d.operating_hours || defaultOperatingHours(),
        });
      }

      if (merchantRes?.data) {
        const m = merchantRes.data;
        setMerchantInfo({
          business_number: m.business_number || '',
          representative_name: m.representative_name || '',
          bank_name: m.bank_name || '',
          bank_account: m.bank_account || '',
          bank_holder: m.bank_holder || '',
        });
      }
    } catch (err: any) {
      setError('매장 정보를 불러오는데 실패했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStoreChange = (field: keyof StoreData, value: any) => {
    setStoreData((prev) => ({ ...prev, [field]: value }));
  };

  const handleHourChange = (dayKey: string, type: 'open' | 'close', value: string) => {
    setStoreData((prev) => ({
      ...prev,
      operating_hours: {
        ...prev.operating_hours,
        [dayKey]: { ...prev.operating_hours[dayKey], [type]: value },
      },
    }));
  };

  const handleBankChange = (field: keyof MerchantInfo, value: string) => {
    setMerchantInfo((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveStore = async () => {
    if (!restaurantId) {
      setError('매장 ID를 찾을 수 없습니다.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.put(`/api/restaurants/${restaurantId}`, {
        name: storeData.name,
        description: storeData.description,
        category: storeData.category,
        phone: storeData.phone,
        address: storeData.address,
        address_detail: storeData.address_detail,
        seat_count: storeData.seat_count,
        operating_hours: storeData.operating_hours,
      });
      setSuccess('매장 정보가 저장되었습니다.');
      setEditing(false);
    } catch (err: any) {
      setError(err.response?.data?.message || '매장 정보 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBank = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.put('/api/merchants/me', {
        bank_name: merchantInfo.bank_name,
        bank_account: merchantInfo.bank_account,
        bank_holder: merchantInfo.bank_holder,
      });
      setSuccess('정산 계좌 정보가 저장되었습니다.');
      setEditingBank(false);
    } catch (err: any) {
      setError(err.response?.data?.message || '정산 계좌 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress sx={{ color: '#C4A08A' }} />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        매장 정보
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* 매장 기본 정보 */}
      <Card sx={{ mb: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">기본 정보</Typography>
            {!editing ? (
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => setEditing(true)}
                sx={{ borderColor: '#C4A08A', color: '#C4A08A' }}
              >
                수정
              </Button>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveStore}
                  disabled={saving}
                  sx={{
                    background: 'linear-gradient(135deg, #C4A08A 0%, #D8BCA8 100%)',
                    '&:hover': { background: 'linear-gradient(135deg, #A88068 0%, #C4A08A 100%)' },
                  }}
                >
                  저장
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CancelIcon />}
                  onClick={() => { setEditing(false); fetchData(); }}
                  sx={{ borderColor: '#999', color: '#666' }}
                >
                  취소
                </Button>
              </Box>
            )}
          </Box>

          {storeData.image_url && (
            <Box sx={{ mb: 3, textAlign: 'center' }}>
              <Box
                component="img"
                src={storeData.image_url}
                alt="매장 이미지"
                sx={{ maxWidth: 400, maxHeight: 250, borderRadius: 2, objectFit: 'cover' }}
              />
            </Box>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="매장명"
                value={storeData.name}
                onChange={(e) => handleStoreChange('name', e.target.value)}
                disabled={!editing}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth disabled={!editing}>
                <InputLabel>카테고리</InputLabel>
                <Select
                  value={storeData.category}
                  label="카테고리"
                  onChange={(e) => handleStoreChange('category', e.target.value)}
                >
                  {CATEGORIES.map((cat) => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="매장 소개"
                value={storeData.description}
                onChange={(e) => handleStoreChange('description', e.target.value)}
                disabled={!editing}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="전화번호"
                value={storeData.phone}
                onChange={(e) => handleStoreChange('phone', e.target.value)}
                disabled={!editing}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="좌석 수"
                type="number"
                value={storeData.seat_count}
                onChange={(e) => handleStoreChange('seat_count', parseInt(e.target.value) || 0)}
                disabled={!editing}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="주소"
                value={storeData.address}
                onChange={(e) => handleStoreChange('address', e.target.value)}
                disabled={!editing}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="상세 주소"
                value={storeData.address_detail}
                onChange={(e) => handleStoreChange('address_detail', e.target.value)}
                disabled={!editing}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 영업시간 */}
      <Card sx={{ mb: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>영업시간</Typography>
          {DAY_KEYS.map((dayKey, idx) => (
            <Grid container spacing={2} key={dayKey} sx={{ mb: 1, alignItems: 'center' }}>
              <Grid item xs={2} sm={1}>
                <Typography sx={{ fontWeight: 600, textAlign: 'center' }}>{DAYS[idx]}</Typography>
              </Grid>
              <Grid item xs={5} sm={3}>
                <TextField
                  fullWidth
                  type="time"
                  label="오픈"
                  size="small"
                  value={storeData.operating_hours[dayKey]?.open || '11:00'}
                  onChange={(e) => handleHourChange(dayKey, 'open', e.target.value)}
                  disabled={!editing}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={5} sm={3}>
                <TextField
                  fullWidth
                  type="time"
                  label="마감"
                  size="small"
                  value={storeData.operating_hours[dayKey]?.close || '22:00'}
                  onChange={(e) => handleHourChange(dayKey, 'close', e.target.value)}
                  disabled={!editing}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          ))}
        </CardContent>
      </Card>

      {/* 사업자 정보 / 정산 계좌 */}
      <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>사업자 정보</Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="사업자번호"
                value={merchantInfo.business_number}
                disabled
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="대표자명"
                value={merchantInfo.representative_name}
                disabled
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">정산 계좌</Typography>
            {!editingBank ? (
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => setEditingBank(true)}
                sx={{ borderColor: '#C4A08A', color: '#C4A08A' }}
              >
                수정
              </Button>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveBank}
                  disabled={saving}
                  sx={{
                    background: 'linear-gradient(135deg, #C4A08A 0%, #D8BCA8 100%)',
                    '&:hover': { background: 'linear-gradient(135deg, #A88068 0%, #C4A08A 100%)' },
                  }}
                >
                  저장
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CancelIcon />}
                  onClick={() => { setEditingBank(false); fetchData(); }}
                  sx={{ borderColor: '#999', color: '#666' }}
                >
                  취소
                </Button>
              </Box>
            )}
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="은행명"
                value={merchantInfo.bank_name}
                onChange={(e) => handleBankChange('bank_name', e.target.value)}
                disabled={!editingBank}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="계좌번호"
                value={merchantInfo.bank_account}
                onChange={(e) => handleBankChange('bank_account', e.target.value)}
                disabled={!editingBank}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="예금주"
                value={merchantInfo.bank_holder}
                onChange={(e) => handleBankChange('bank_holder', e.target.value)}
                disabled={!editingBank}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default StoreInfo;
