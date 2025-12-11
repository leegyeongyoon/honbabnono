import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Chip,
  Alert,
  Snackbar,
  Pagination,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  PushPin as PinIcon,
} from '@mui/icons-material';
import axios from 'axios';

interface Notice {
  id: number;
  title: string;
  content: string;
  type: 'general' | 'important' | 'maintenance' | 'event';
  created_at: string;
  updated_at: string;
  is_pinned: boolean;
  is_active: boolean;
  views: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  notices?: Notice[];
  notice?: Notice;
  message?: string;
  error?: string;
}

const NoticeManagement: React.FC = () => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'general' as Notice['type'],
    is_pinned: false,
    is_active: true,
  });

  // Snackbar
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

  const loadNotices = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:3001/api/admin/notices?page=${page}&limit=10`,
        {
          headers: getAuthHeader(),
        }
      );
      
      const data = response.data as ApiResponse<{ notices: Notice[]; totalPages: number }>;
      if (data.success && data.data) {
        setNotices(data.data.notices);
        setTotalPages(data.data.totalPages);
      }
    } catch (error) {
      console.error('공지사항 로드 실패:', error);
      setSnackbar({
        open: true,
        message: '공지사항을 불러오는데 실패했습니다.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotices();
  }, [page]);

  const handleCreate = () => {
    setDialogMode('create');
    setFormData({
      title: '',
      content: '',
      type: 'general',
      is_pinned: false,
      is_active: true,
    });
    setSelectedNotice(null);
    setOpenDialog(true);
  };

  const handleEdit = (notice: Notice) => {
    setDialogMode('edit');
    setFormData({
      title: notice.title,
      content: notice.content,
      type: notice.type,
      is_pinned: notice.is_pinned,
      is_active: notice.is_active,
    });
    setSelectedNotice(notice);
    setOpenDialog(true);
  };

  const handleView = (notice: Notice) => {
    setDialogMode('view');
    setSelectedNotice(notice);
    setOpenDialog(true);
  };

  const handleSubmit = async () => {
    try {
      const url = dialogMode === 'create' 
        ? 'http://localhost:3001/api/admin/notices'
        : `http://localhost:3001/api/admin/notices/${selectedNotice?.id}`;
      
      const method = dialogMode === 'create' ? 'POST' : 'PUT';
      
      const response = await axios({
        method,
        url,
        data: formData,
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
      });

      const data: any = response.data;
      if (data.success) {
        setSnackbar({
          open: true,
          message: data.message || `공지사항이 성공적으로 ${dialogMode === 'create' ? '생성' : '수정'}되었습니다.`,
          severity: 'success',
        });
        setOpenDialog(false);
        loadNotices();
      }
    } catch (error: any) {
      console.error('공지사항 저장 실패:', error);
      const errorMessage = error.response?.data?.error || `공지사항 ${dialogMode === 'create' ? '생성' : '수정'}에 실패했습니다.`;
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    }
  };

  const handleTogglePin = async (notice: Notice) => {
    try {
      await axios.patch(
        `http://localhost:3001/api/admin/notices/${notice.id}/pin`,
        { is_pinned: !notice.is_pinned },
        { headers: getAuthHeader() }
      );
      
      setSnackbar({
        open: true,
        message: `공지사항이 ${notice.is_pinned ? '고정 해제' : '고정'}되었습니다.`,
        severity: 'success',
      });
      loadNotices();
    } catch (error) {
      console.error('고정 상태 변경 실패:', error);
      setSnackbar({
        open: true,
        message: '고정 상태 변경에 실패했습니다.',
        severity: 'error',
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('정말로 이 공지사항을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await axios.delete(`http://localhost:3001/api/admin/notices/${id}`, {
        headers: getAuthHeader(),
      });
      
      setSnackbar({
        open: true,
        message: '공지사항이 삭제되었습니다.',
        severity: 'success',
      });
      loadNotices();
    } catch (error) {
      console.error('공지사항 삭제 실패:', error);
      setSnackbar({
        open: true,
        message: '공지사항 삭제에 실패했습니다.',
        severity: 'error',
      });
    }
  };

  const getTypeLabel = (type: Notice['type']) => {
    const types = {
      general: { label: '일반', color: 'default' },
      important: { label: '중요', color: 'error' },
      maintenance: { label: '점검', color: 'warning' },
      event: { label: '이벤트', color: 'success' },
    };
    return types[type] || types.general;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          공지사항 관리
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
          sx={{ 
            backgroundColor: '#C9B59C',
            '&:hover': {
              backgroundColor: '#A08B7A',
            },
          }}
        >
          공지사항 추가
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>제목</TableCell>
              <TableCell>타입</TableCell>
              <TableCell>고정</TableCell>
              <TableCell>조회수</TableCell>
              <TableCell>작성일</TableCell>
              <TableCell>활성화</TableCell>
              <TableCell align="center">액션</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {notices.map((notice) => {
              const typeInfo = getTypeLabel(notice.type);
              return (
                <TableRow key={notice.id}>
                  <TableCell>{notice.id}</TableCell>
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        maxWidth: 200, 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontWeight: notice.is_pinned ? 'bold' : 'normal'
                      }}
                    >
                      {notice.title}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={typeInfo.label} 
                      color={typeInfo.color as any}
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleTogglePin(notice)}
                      color={notice.is_pinned ? 'warning' : 'default'}
                    >
                      {notice.is_pinned ? <PinIcon /> : <PinIcon style={{ opacity: 0.3 }} />}
                    </IconButton>
                  </TableCell>
                  <TableCell>{notice.views}</TableCell>
                  <TableCell>{formatDate(notice.created_at)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={notice.is_active ? '활성' : '비활성'} 
                      color={notice.is_active ? 'success' : 'default'}
                      size="small" 
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Box display="flex" gap={1}>
                      <Tooltip title="보기">
                        <IconButton size="small" onClick={() => handleView(notice)}>
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="수정">
                        <IconButton size="small" onClick={() => handleEdit(notice)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="삭제">
                        <IconButton size="small" onClick={() => handleDelete(notice.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Box display="flex" justifyContent="center" mt={3}>
        <Pagination 
          count={totalPages} 
          page={page} 
          onChange={(_, newPage) => setPage(newPage)}
          color="primary"
        />
      </Box>

      {/* 공지사항 생성/수정 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'create' && '새 공지사항 작성'}
          {dialogMode === 'edit' && '공지사항 수정'}
          {dialogMode === 'view' && '공지사항 보기'}
        </DialogTitle>
        <DialogContent>
          {dialogMode === 'view' ? (
            selectedNotice && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  {selectedNotice.title}
                </Typography>
                <Box mb={2}>
                  <Chip 
                    label={getTypeLabel(selectedNotice.type).label} 
                    color={getTypeLabel(selectedNotice.type).color as any}
                    size="small" 
                  />
                  {selectedNotice.is_pinned && (
                    <Chip label="고정" color="warning" size="small" sx={{ ml: 1 }} />
                  )}
                </Box>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {selectedNotice.content}
                </Typography>
                <Box mt={3}>
                  <Typography variant="caption" color="textSecondary">
                    작성일: {formatDate(selectedNotice.created_at)} | 
                    조회수: {selectedNotice.views}
                  </Typography>
                </Box>
              </Box>
            )
          ) : (
            <Box component="form" sx={{ mt: 2 }}>
              <TextField
                autoFocus
                margin="dense"
                label="제목"
                fullWidth
                variant="outlined"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                sx={{ mb: 2 }}
              />
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>공지 타입</InputLabel>
                <Select
                  value={formData.type}
                  label="공지 타입"
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as Notice['type'] })}
                >
                  <MenuItem value="general">일반</MenuItem>
                  <MenuItem value="important">중요</MenuItem>
                  <MenuItem value="maintenance">점검</MenuItem>
                  <MenuItem value="event">이벤트</MenuItem>
                </Select>
              </FormControl>

              <TextField
                margin="dense"
                label="내용"
                fullWidth
                multiline
                rows={10}
                variant="outlined"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                sx={{ mb: 2 }}
              />

              <Box display="flex" gap={2} mb={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_pinned}
                      onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                    />
                  }
                  label="상단 고정"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                  }
                  label="활성화"
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>취소</Button>
          {dialogMode !== 'view' && (
            <Button 
              onClick={handleSubmit} 
              variant="contained"
              sx={{ 
                backgroundColor: '#C9B59C',
                '&:hover': {
                  backgroundColor: '#A08B7A',
                },
              }}
            >
              {dialogMode === 'create' ? '생성' : '수정'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

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

export default NoticeManagement;