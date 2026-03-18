import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PeopleIcon from '@mui/icons-material/People';
import CategoryIcon from '@mui/icons-material/Category';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import apiClient from '../utils/api';

interface Badge {
  id: string;
  name: string;
  description: string;
  category: string;
  required_count: number;
  icon: string;
  is_active: boolean;
  awarded_count: number;
}

interface BadgeStats {
  total_badges: number;
  total_awarded: number;
  unique_users: number;
  byCategory: Array<{ category: string; count: number }>;
}

interface BadgeFormData {
  name: string;
  description: string;
  category: string;
  required_count: number;
  icon: string;
  is_active: boolean;
}

const BADGE_CATEGORIES = [
  { value: 'attendance', label: '출석' },
  { value: 'meetup', label: '모임' },
  { value: 'review', label: '리뷰' },
  { value: 'social', label: '소셜' },
  { value: 'special', label: '특별' },
];

const BADGE_ICONS = ['🏆', '⭐', '🎖️', '🥇', '🥈', '🥉', '💎', '🔥', '❤️', '🎉', '👑', '🌟', '🍚', '🍜', '🍛', '🍱'];

const defaultFormData: BadgeFormData = {
  name: '',
  description: '',
  category: 'meetup',
  required_count: 1,
  icon: '🏆',
  is_active: true,
};

const BadgeManagement: React.FC = () => {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [stats, setStats] = useState<BadgeStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [awardDialogOpen, setAwardDialogOpen] = useState(false);
  const [editingBadge, setEditingBadge] = useState<Badge | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [formData, setFormData] = useState<BadgeFormData>(defaultFormData);
  const [awardUserId, setAwardUserId] = useState('');
  const [awardBadgeId, setAwardBadgeId] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  const fetchBadges = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/admin/badges');
      const data = response.data as any;
      setBadges(data.badges || []);
    } catch {
      setSnackbar({
        open: true,
        message: '뱃지 목록을 불러오는데 실패했습니다.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/admin/badges/stats');
      const data = response.data as any;
      setStats(data.data || null);
    } catch {
      // Stats failure is non-critical
    }
  }, []);

  useEffect(() => {
    fetchBadges();
    fetchStats();
  }, [fetchBadges, fetchStats]);

  const handleOpenCreateDialog = () => {
    setEditingBadge(null);
    setFormData(defaultFormData);
    setFormDialogOpen(true);
  };

  const handleOpenEditDialog = (badge: Badge) => {
    setEditingBadge(badge);
    setFormData({
      name: badge.name,
      description: badge.description,
      category: badge.category,
      required_count: badge.required_count,
      icon: badge.icon,
      is_active: badge.is_active,
    });
    setFormDialogOpen(true);
  };

  const handleFormChange = (field: keyof BadgeFormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitBadge = async () => {
    if (!formData.name || !formData.description) return;

    try {
      if (editingBadge) {
        await apiClient.put(`/api/admin/badges/${editingBadge.id}`, formData);
        setSnackbar({ open: true, message: '뱃지가 수정되었습니다.', severity: 'success' });
      } else {
        await apiClient.post('/api/admin/badges', formData);
        setSnackbar({ open: true, message: '뱃지가 생성되었습니다.', severity: 'success' });
      }
      setFormDialogOpen(false);
      fetchBadges();
      fetchStats();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || '뱃지 저장 중 오류가 발생했습니다.',
        severity: 'error',
      });
    }
  };

  const handleDeleteBadge = async () => {
    if (!selectedBadge) return;

    try {
      await apiClient.delete(`/api/admin/badges/${selectedBadge.id}`);
      setDeleteDialogOpen(false);
      setSelectedBadge(null);
      setSnackbar({ open: true, message: '뱃지가 삭제되었습니다.', severity: 'success' });
      fetchBadges();
      fetchStats();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || '뱃지 삭제 중 오류가 발생했습니다.',
        severity: 'error',
      });
    }
  };

  const handleAwardBadge = async () => {
    if (!awardUserId || !awardBadgeId) return;

    try {
      await apiClient.post('/api/admin/badges/award', {
        userId: awardUserId,
        badgeId: awardBadgeId,
      });
      setAwardDialogOpen(false);
      setAwardUserId('');
      setAwardBadgeId('');
      setSnackbar({ open: true, message: '뱃지가 수여되었습니다.', severity: 'success' });
      fetchBadges();
      fetchStats();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || '뱃지 수여 중 오류가 발생했습니다.',
        severity: 'error',
      });
    }
  };

  const getCategoryLabel = (category: string): string => {
    const found = BADGE_CATEGORIES.find(c => c.value === category);
    return found ? found.label : category;
  };

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'attendance': return '#4CAF50';
      case 'meetup': return '#C9B59C';
      case 'review': return '#FF9800';
      case 'social': return '#2196F3';
      case 'special': return '#9C27B0';
      default: return '#757575';
    }
  };

  const filteredBadges = categoryFilter === 'all'
    ? badges
    : badges.filter(b => b.category === categoryFilter);

  const groupedBadges: Record<string, Badge[]> = {};
  filteredBadges.forEach(badge => {
    if (!groupedBadges[badge.category]) {
      groupedBadges[badge.category] = [];
    }
    groupedBadges[badge.category].push(badge);
  });

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">뱃지 관리</Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<PersonAddIcon />}
            onClick={() => setAwardDialogOpen(true)}
            sx={{
              borderColor: '#C9B59C',
              color: '#4C422C',
              '&:hover': { borderColor: '#A08B7A', backgroundColor: '#F9F8F6' },
            }}
          >
            뱃지 수여
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateDialog}
            sx={{
              backgroundColor: '#C9B59C',
              '&:hover': { backgroundColor: '#A08B7A' },
            }}
          >
            뱃지 추가
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
          gap: 2,
          mb: 3,
        }}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CardGiftcardIcon sx={{ fontSize: 40, color: '#C9B59C' }} />
              <Box>
                <Typography variant="body2" color="text.secondary">전체 뱃지</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>{stats.total_badges}</Typography>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <EmojiEventsIcon sx={{ fontSize: 40, color: '#FFD700' }} />
              <Box>
                <Typography variant="body2" color="text.secondary">수여 횟수</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>{stats.total_awarded}</Typography>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <PeopleIcon sx={{ fontSize: 40, color: '#4C422C' }} />
              <Box>
                <Typography variant="body2" color="text.secondary">보유 사용자</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>{stats.unique_users}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Category Filter */}
      <Box sx={{ mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>카테고리</InputLabel>
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            label="카테고리"
          >
            <MenuItem value="all">전체</MenuItem>
            {BADGE_CATEGORIES.map(cat => (
              <MenuItem key={cat.value} value={cat.value}>{cat.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Badge List */}
      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress sx={{ color: '#C9B59C' }} />
        </Box>
      ) : Object.keys(groupedBadges).length > 0 ? (
        Object.entries(groupedBadges).map(([category, categoryBadges]) => (
          <Box key={category} sx={{ mb: 4 }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <CategoryIcon sx={{ color: getCategoryColor(category) }} />
              <Typography variant="h6">
                {getCategoryLabel(category)}
              </Typography>
              <Chip label={`${categoryBadges.length}개`} size="small" />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
              {categoryBadges.map((badge) => (
                <Box key={badge.id}>
                  <Card sx={{
                    height: '100%',
                    opacity: badge.is_active ? 1 : 0.6,
                    border: badge.is_active ? undefined : '1px dashed #ccc',
                  }}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Typography variant="h3" sx={{ lineHeight: 1 }}>
                          {badge.icon}
                        </Typography>
                        <Box display="flex" gap={0.5}>
                          <Tooltip title="수정">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenEditDialog(badge)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="삭제">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                setSelectedBadge(badge);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 1 }}>
                        {badge.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, minHeight: 40 }}>
                        {badge.description}
                      </Typography>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Chip
                          label={getCategoryLabel(badge.category)}
                          size="small"
                          sx={{
                            backgroundColor: `${getCategoryColor(badge.category)}20`,
                            color: getCategoryColor(badge.category),
                          }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          수여 {badge.awarded_count}회
                        </Typography>
                      </Box>
                      {!badge.is_active && (
                        <Chip label="비활성" size="small" color="default" sx={{ mt: 1 }} />
                      )}
                    </CardContent>
                  </Card>
                </Box>
              ))}
            </Box>
          </Box>
        ))
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">등록된 뱃지가 없습니다.</Typography>
        </Paper>
      )}

      {/* Create/Edit Badge Dialog */}
      <Dialog open={formDialogOpen} onClose={() => setFormDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingBadge ? '뱃지 수정' : '새 뱃지 추가'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="뱃지 이름"
              value={formData.name}
              onChange={(e) => handleFormChange('name', e.target.value)}
              required
            />
            <TextField
              fullWidth
              label="설명"
              value={formData.description}
              onChange={(e) => handleFormChange('description', e.target.value)}
              multiline
              rows={2}
              required
            />
            <FormControl fullWidth>
              <InputLabel>카테고리</InputLabel>
              <Select
                value={formData.category}
                onChange={(e) => handleFormChange('category', e.target.value)}
                label="카테고리"
              >
                {BADGE_CATEGORIES.map(cat => (
                  <MenuItem key={cat.value} value={cat.value}>{cat.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="달성 조건 횟수"
              type="number"
              value={formData.required_count}
              onChange={(e) => handleFormChange('required_count', parseInt(e.target.value, 10) || 0)}
              inputProps={{ min: 0 }}
            />
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                아이콘 선택
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {BADGE_ICONS.map(icon => (
                  <Button
                    key={icon}
                    variant={formData.icon === icon ? 'contained' : 'outlined'}
                    onClick={() => handleFormChange('icon', icon)}
                    sx={{
                      minWidth: 48,
                      height: 48,
                      fontSize: 24,
                      backgroundColor: formData.icon === icon ? '#C9B59C' : undefined,
                      '&:hover': {
                        backgroundColor: formData.icon === icon ? '#A08B7A' : '#F9F8F6',
                      },
                    }}
                  >
                    {icon}
                  </Button>
                ))}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormDialogOpen(false)}>취소</Button>
          <Button
            onClick={handleSubmitBadge}
            variant="contained"
            disabled={!formData.name || !formData.description}
            sx={{
              backgroundColor: '#C9B59C',
              '&:hover': { backgroundColor: '#A08B7A' },
            }}
          >
            {editingBadge ? '수정' : '생성'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <WarningAmberIcon sx={{ color: '#ED6C02' }} />
            뱃지 삭제
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedBadge && (
            <Box sx={{ pt: 1 }}>
              <Alert severity="warning" sx={{ mb: 2 }}>
                이 뱃지를 삭제하면 관련된 수여 기록도 영향을 받을 수 있습니다.
              </Alert>
              <Typography>
                <strong>{selectedBadge.icon} {selectedBadge.name}</strong> 뱃지를 삭제하시겠습니까?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                현재 수여 횟수: {selectedBadge.awarded_count}회
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>취소</Button>
          <Button onClick={handleDeleteBadge} color="error" variant="contained">
            삭제
          </Button>
        </DialogActions>
      </Dialog>

      {/* Award Badge Dialog */}
      <Dialog open={awardDialogOpen} onClose={() => setAwardDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>뱃지 수여</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="사용자 ID"
              value={awardUserId}
              onChange={(e) => setAwardUserId(e.target.value)}
              placeholder="사용자 ID를 입력하세요"
              required
            />
            <FormControl fullWidth>
              <InputLabel>뱃지 선택</InputLabel>
              <Select
                value={awardBadgeId}
                onChange={(e) => setAwardBadgeId(e.target.value)}
                label="뱃지 선택"
              >
                {badges.filter(b => b.is_active).map(badge => (
                  <MenuItem key={badge.id} value={badge.id}>
                    {badge.icon} {badge.name} ({getCategoryLabel(badge.category)})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAwardDialogOpen(false)}>취소</Button>
          <Button
            onClick={handleAwardBadge}
            variant="contained"
            disabled={!awardUserId || !awardBadgeId}
            sx={{
              backgroundColor: '#C9B59C',
              '&:hover': { backgroundColor: '#A08B7A' },
            }}
          >
            수여
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BadgeManagement;
