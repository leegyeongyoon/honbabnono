import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Divider from '@mui/material/Divider';
import StoreIcon from '@mui/icons-material/Store';
import apiClient from '../utils/api';

interface StoreRegisterProps {
  onComplete: () => void;
}

const CATEGORIES = [
  '한식', '중식', '일식', '양식', '고깃집', '샤브샤브',
  '전골찜', '훠궈', '코스요리', '카페', '기타',
];

const StoreRegister: React.FC<StoreRegisterProps> = ({ onComplete }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [seatCount, setSeatCount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isValid = name.trim() && category && address.trim();

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      const res = await apiClient.post('/api/restaurants', {
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        phone: phone.trim() || undefined,
        address: address.trim(),
        address_detail: addressDetail.trim() || undefined,
        seat_count: seatCount ? parseInt(seatCount) : undefined,
      });

      // Update local merchant data with new restaurant_id
      const stored = localStorage.getItem('merchantData');
      if (stored) {
        try {
          const data = JSON.parse(stored);
          data.restaurant_id = res.data.data?.id || res.data.id;
          delete data.restaurantId; // 과거 이중 키 잔재 정리 — restaurant_id 단일 키 사용
          localStorage.setItem('merchantData', JSON.stringify(data));
        } catch {
          // ignore parse error
        }
      }

      onComplete();
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || '매장 등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 640, mx: 'auto', py: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 2,
          }}
        >
          <StoreIcon sx={{ color: '#fff', fontSize: 32 }} />
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          매장 등록
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          고객이 검색하고 예약할 매장 정보를 입력해주세요
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'primary.dark' }}>
            기본 정보
          </Typography>

          <TextField
            fullWidth
            label="매장명 *"
            placeholder="예: 잇테이블 강남점"
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>카테고리 *</InputLabel>
            <Select value={category} label="카테고리 *" onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((cat) => (
                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            multiline
            rows={3}
            label="매장 소개"
            placeholder="매장을 소개해주세요 (선택)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            sx={{ mb: 2 }}
          />

          <Divider sx={{ my: 2.5 }} />

          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'primary.dark' }}>
            연락처 및 위치
          </Typography>

          <TextField
            fullWidth
            label="전화번호"
            placeholder="02-1234-5678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="주소 *"
            placeholder="서울시 강남구 테헤란로 123"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="상세 주소"
            placeholder="2층, 201호"
            value={addressDetail}
            onChange={(e) => setAddressDetail(e.target.value)}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            type="number"
            label="좌석 수"
            placeholder="총 좌석 수 (선택)"
            value={seatCount}
            onChange={(e) => setSeatCount(e.target.value)}
            inputProps={{ min: 1 }}
          />
        </CardContent>
      </Card>

      <Box sx={{ mt: 3 }}>
        <Button
          fullWidth
          variant="contained"
          color="primary"
          size="large"
          disabled={loading || !isValid}
          onClick={handleSubmit}
          sx={{ py: 1.5, fontSize: '1rem' }}
        >
          {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : '매장 등록하기'}
        </Button>
      </Box>
    </Box>
  );
};

export default StoreRegister;
