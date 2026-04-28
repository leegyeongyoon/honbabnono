import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  InputAdornment,
  Switch,
  Chip,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import StoreIcon from '@mui/icons-material/Store';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import apiClient from '../utils/api';

interface Restaurant {
  id: string;
  name: string;
  category: string;
  address: string;
  owner_name: string;
  is_active: boolean;
  created_at: string;
  phone?: string;
  description?: string;
}

const RestaurantManagement: React.FC = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const categories = ['all', '한식', '중식', '일식', '양식', '카페', '분식', '치킨', '피자', '기타'];

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/admin/restaurants', { params: { limit: 100 } });
      const body = response.data as any;
      const data = body?.restaurants || body?.data || body || [];
      setRestaurants(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('매장 목록 조회 실패:', error);
      setSnackbar({ open: true, message: '매장 목록을 불러오는데 실패했습니다.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (restaurant: Restaurant) => {
    try {
      await apiClient.patch(`/api/admin/restaurants/${restaurant.id}/toggle`, {
        is_active: !restaurant.is_active,
      });
      setRestaurants(prev =>
        prev.map(r => (r.id === restaurant.id ? { ...r, is_active: !r.is_active } : r))
      );
      setSnackbar({
        open: true,
        message: `${restaurant.name} 매장이 ${!restaurant.is_active ? '활성화' : '비활성화'}되었습니다.`,
        severity: 'success',
      });
    } catch (error) {
      console.error('매장 상태 변경 실패:', error);
      setSnackbar({ open: true, message: '매장 상태 변경에 실패했습니다.', severity: 'error' });
    }
  };

  const filteredRestaurants = restaurants.filter(r => {
    const matchesSearch =
      r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.owner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.address?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || r.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const activeCount = restaurants.filter(r => r.is_active).length;
  const inactiveCount = restaurants.filter(r => !r.is_active).length;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        매장 관리
      </Typography>

      {/* 통계 카드 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <StoreIcon sx={{ fontSize: 40, color: '#C9B59C' }} />
              <Box>
                <Typography variant="body2" color="text.secondary">전체 매장</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>{restaurants.length}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CheckCircleIcon sx={{ fontSize: 40, color: '#2E7D4F' }} />
              <Box>
                <Typography variant="body2" color="text.secondary">활성 매장</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#2E7D4F' }}>{activeCount}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CancelIcon sx={{ fontSize: 40, color: '#D32F2F' }} />
              <Box>
                <Typography variant="body2" color="text.secondary">비활성 매장</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#D32F2F' }}>{inactiveCount}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 검색/필터 */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          placeholder="매장명, 점주명, 주소 검색"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          sx={{ flex: 1, maxWidth: 400 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>카테고리</InputLabel>
          <Select
            value={categoryFilter}
            label="카테고리"
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            {categories.map(cat => (
              <MenuItem key={cat} value={cat}>
                {cat === 'all' ? '전체' : cat}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* 테이블 */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#F9F8F6' }}>
                <TableCell sx={{ fontWeight: 600 }}>매장명</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>카테고리</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>주소</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>점주명</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>활성상태</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>등록일</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>활성/비활성</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRestaurants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">매장 데이터가 없습니다.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRestaurants.map((restaurant) => (
                  <TableRow key={restaurant.id} hover>
                    <TableCell>{restaurant.name}</TableCell>
                    <TableCell>
                      <Chip label={restaurant.category || '-'} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {restaurant.address || '-'}
                    </TableCell>
                    <TableCell>{restaurant.owner_name || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={restaurant.is_active ? '활성' : '비활성'}
                        size="small"
                        color={restaurant.is_active ? 'success' : 'error'}
                      />
                    </TableCell>
                    <TableCell>
                      {restaurant.created_at
                        ? new Date(restaurant.created_at).toLocaleDateString('ko-KR')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={restaurant.is_active}
                        onChange={() => handleToggleActive(restaurant)}
                        color="success"
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RestaurantManagement;
