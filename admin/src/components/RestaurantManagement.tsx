import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  Switch,
  Chip,
  Grid,
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
import { formatDate } from '../utils/format';
import { PageHeader, EmptyState, StatCard, LoadingSkeleton, ResponsiveTableContainer } from './common';

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
      <PageHeader title="매장 관리" />

      {/* 통계 카드 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard label="전체 매장" value={restaurants.length} icon={<StoreIcon />} color="primary" />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard label="활성 매장" value={activeCount} icon={<CheckCircleIcon />} color="success" />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard label="비활성 매장" value={inactiveCount} icon={<CancelIcon />} color="error" />
        </Grid>
      </Grid>

      {/* 검색/필터 */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <TextField
          placeholder="매장명, 점주명, 주소 검색"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          sx={{ width: { xs: '100%', sm: 360 } }}
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
        <LoadingSkeleton variant="table" columns={7} />
      ) : filteredRestaurants.length === 0 ? (
        <EmptyState icon={<StoreIcon />} title="매장 데이터가 없습니다." />
      ) : (
        <ResponsiveTableContainer minWidth={840}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>매장명</TableCell>
                <TableCell>카테고리</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>주소</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>점주명</TableCell>
                <TableCell>활성상태</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>등록일</TableCell>
                <TableCell>활성/비활성</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRestaurants.map((restaurant) => (
                <TableRow key={restaurant.id} hover>
                  <TableCell>{restaurant.name}</TableCell>
                  <TableCell>
                    <Chip label={restaurant.category || '-'} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {restaurant.address || '-'}
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{restaurant.owner_name || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={restaurant.is_active ? '활성' : '비활성'}
                      size="small"
                      color={restaurant.is_active ? 'success' : 'error'}
                    />
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    {formatDate(restaurant.created_at)}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={restaurant.is_active}
                      onChange={() => handleToggleActive(restaurant)}
                      color="success"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ResponsiveTableContainer>
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
