import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  TablePagination,
  Alert,
  Snackbar,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  VpnKey as KeyIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import apiClient from '../utils/api';

interface Admin {
  id: string;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const AdminManagement: React.FC = () => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // 다이얼로그 상태
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);

  // 폼 상태
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'admin',
    is_active: true,
  });

  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  // 스낵바 상태
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });


  const loadAdmins = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/admin/accounts', {
        params: {
          page: page + 1,
          limit: rowsPerPage,
        },
      });

      const data = response.data as ApiResponse<Admin[]>;
      if (data.success) {
        setAdmins(data.data);
        setTotalCount(data.pagination?.total || 0);
      }
    } catch (error) {
      console.error('관리자 목록 로드 실패:', error);
      setSnackbar({
        open: true,
        message: '관리자 목록을 불러오는데 실패했습니다.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage]);

  const handleCreateAdmin = async () => {
    try {
      if (!formData.username || !formData.email || !formData.password) {
        setSnackbar({
          open: true,
          message: '모든 필수 필드를 입력해주세요.',
          severity: 'error',
        });
        return;
      }

      if (formData.password.length < 8) {
        setSnackbar({
          open: true,
          message: '비밀번호는 최소 8자 이상이어야 합니다.',
          severity: 'error',
        });
        return;
      }

      const response = await apiClient.post('/api/admin/accounts', formData);

      const data = response.data as ApiResponse<Admin>;
      if (data.success) {
        setSnackbar({
          open: true,
          message: '관리자 계정이 성공적으로 생성되었습니다.',
          severity: 'success',
        });
        setCreateDialogOpen(false);
        setFormData({
          username: '',
          email: '',
          password: '',
          role: 'admin',
          is_active: true,
        });
        loadAdmins();
      }
    } catch (error: any) {
      console.error('관리자 생성 실패:', error);
      const errorMessage = error.response?.data?.error || '관리자 계정 생성에 실패했습니다.';
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    }
  };

  const handleEditAdmin = async () => {
    if (!selectedAdmin) return;

    try {
      const response = await apiClient.put(
        `/api/admin/accounts/${selectedAdmin.id}`,
        {
          username: formData.username,
          email: formData.email,
          role: formData.role,
          is_active: formData.is_active,
        }
      );

      const data = response.data as ApiResponse<Admin>;
      if (data.success) {
        setSnackbar({
          open: true,
          message: '관리자 계정이 성공적으로 수정되었습니다.',
          severity: 'success',
        });
        setEditDialogOpen(false);
        setSelectedAdmin(null);
        loadAdmins();
      }
    } catch (error: any) {
      console.error('관리자 수정 실패:', error);
      const errorMessage = error.response?.data?.error || '관리자 계정 수정에 실패했습니다.';
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    }
  };

  const handleChangePassword = async () => {
    if (!selectedAdmin) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setSnackbar({
        open: true,
        message: '비밀번호가 일치하지 않습니다.',
        severity: 'error',
      });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setSnackbar({
        open: true,
        message: '비밀번호는 최소 8자 이상이어야 합니다.',
        severity: 'error',
      });
      return;
    }

    try {
      const response = await apiClient.put(
        `/api/admin/accounts/${selectedAdmin.id}/password`,
        { newPassword: passwordData.newPassword }
      );

      const data = response.data as ApiResponse<any>;
      if (data.success) {
        setSnackbar({
          open: true,
          message: '비밀번호가 성공적으로 변경되었습니다.',
          severity: 'success',
        });
        setPasswordDialogOpen(false);
        setPasswordData({ newPassword: '', confirmPassword: '' });
        setSelectedAdmin(null);
      }
    } catch (error: any) {
      console.error('비밀번호 변경 실패:', error);
      const errorMessage = error.response?.data?.error || '비밀번호 변경에 실패했습니다.';
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    }
  };

  const handleDeleteAdmin = async (admin: Admin) => {
    if (!window.confirm(`정말로 ${admin.username} 계정을 비활성화하시겠습니까?`)) {
      return;
    }

    try {
      const response = await apiClient.delete(`/api/admin/accounts/${admin.id}`);

      const data = response.data as ApiResponse<any>;
      if (data.success) {
        setSnackbar({
          open: true,
          message: '관리자 계정이 성공적으로 비활성화되었습니다.',
          severity: 'success',
        });
        loadAdmins();
      }
    } catch (error: any) {
      console.error('관리자 삭제 실패:', error);
      const errorMessage = error.response?.data?.error || '관리자 계정 삭제에 실패했습니다.';
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    }
  };

  const openEditDialog = (admin: Admin) => {
    setSelectedAdmin(admin);
    setFormData({
      username: admin.username,
      email: admin.email,
      password: '',
      role: admin.role,
      is_active: admin.is_active,
    });
    setEditDialogOpen(true);
  };

  const openPasswordDialog = (admin: Admin) => {
    setSelectedAdmin(admin);
    setPasswordData({ newPassword: '', confirmPassword: '' });
    setPasswordDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'error';
      case 'admin':
        return 'primary';
      default:
        return 'default';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin':
        return '슈퍼 관리자';
      case 'admin':
        return '관리자';
      default:
        return role;
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          관리자 계정 관리
        </Typography>
        <Box>
          <Button
            startIcon={<RefreshIcon />}
            onClick={loadAdmins}
            sx={{ mr: 1 }}
            disabled={loading}
          >
            새로고침
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{ backgroundColor: '#C9B59C' }}
          >
            관리자 추가
          </Button>
        </Box>
      </Box>

      <Card>
        <CardContent>
          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer component={Paper} elevation={0}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>사용자명</TableCell>
                      <TableCell>이메일</TableCell>
                      <TableCell>역할</TableCell>
                      <TableCell>상태</TableCell>
                      <TableCell>마지막 로그인</TableCell>
                      <TableCell>생성일</TableCell>
                      <TableCell>작업</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {admins.map((admin) => (
                      <TableRow key={admin.id}>
                        <TableCell>{admin.username}</TableCell>
                        <TableCell>{admin.email}</TableCell>
                        <TableCell>
                          <Chip
                            label={getRoleLabel(admin.role)}
                            color={getRoleColor(admin.role) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={admin.is_active ? '활성' : '비활성'}
                            color={admin.is_active ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {admin.last_login ? formatDate(admin.last_login) : '없음'}
                        </TableCell>
                        <TableCell>{formatDate(admin.created_at)}</TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => openEditDialog(admin)}
                            color="primary"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => openPasswordDialog(admin)}
                            color="warning"
                          >
                            <KeyIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteAdmin(admin)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={totalCount}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(event) => {
                  setRowsPerPage(parseInt(event.target.value, 10));
                  setPage(0);
                }}
                labelRowsPerPage="페이지당 행 수:"
                labelDisplayedRows={({ from, to, count }) =>
                  `${count}개 중 ${from}~${to}`
                }
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* 관리자 생성 다이얼로그 */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>새 관리자 계정 생성</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="사용자명"
            fullWidth
            variant="outlined"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="이메일"
            type="email"
            fullWidth
            variant="outlined"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="비밀번호"
            type="password"
            fullWidth
            variant="outlined"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            sx={{ mb: 2 }}
            helperText="최소 8자 이상 입력해주세요."
          />
          <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
            <InputLabel>역할</InputLabel>
            <Select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              label="역할"
            >
              <MenuItem value="admin">관리자</MenuItem>
              <MenuItem value="super_admin">슈퍼 관리자</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>취소</Button>
          <Button onClick={handleCreateAdmin} variant="contained">
            생성
          </Button>
        </DialogActions>
      </Dialog>

      {/* 관리자 수정 다이얼로그 */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>관리자 계정 수정</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="사용자명"
            fullWidth
            variant="outlined"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="이메일"
            type="email"
            fullWidth
            variant="outlined"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
            <InputLabel>역할</InputLabel>
            <Select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              label="역할"
            >
              <MenuItem value="admin">관리자</MenuItem>
              <MenuItem value="super_admin">슈퍼 관리자</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Switch
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
            }
            label="계정 활성화"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>취소</Button>
          <Button onClick={handleEditAdmin} variant="contained">
            저장
          </Button>
        </DialogActions>
      </Dialog>

      {/* 비밀번호 변경 다이얼로그 */}
      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>비밀번호 변경</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {selectedAdmin?.username}의 비밀번호를 변경합니다.
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="새 비밀번호"
            type="password"
            fullWidth
            variant="outlined"
            value={passwordData.newPassword}
            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
            sx={{ mb: 2 }}
            helperText="최소 8자 이상 입력해주세요."
          />
          <TextField
            margin="dense"
            label="비밀번호 확인"
            type="password"
            fullWidth
            variant="outlined"
            value={passwordData.confirmPassword}
            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialogOpen(false)}>취소</Button>
          <Button onClick={handleChangePassword} variant="contained">
            변경
          </Button>
        </DialogActions>
      </Dialog>

      {/* 스낵바 */}
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

export default AdminManagement;