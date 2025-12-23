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
  TablePagination,
  Alert,
  Snackbar,
  CircularProgress,
  Avatar,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Image as ImageIcon,
  Launch as LaunchIcon,
  PhotoCamera,
} from '@mui/icons-material';
import apiClient from '../utils/api';

interface Advertisement {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  linkUrl: string;
  useDetailPage: boolean;
  detailContent: string | null;
  businessName: string | null;
  contactInfo: string | null;
  position: 'home_banner' | 'sidebar' | 'bottom';
  isActive: boolean;
  priority: number;
  clickCount: number;
  viewCount: number;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
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

const AdvertisementManagement: React.FC = () => {
  // 공통 이미지 URL 처리 함수
  const getImageUrl = (url: string | undefined) => {
    if (!url) return '';
    return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  };

  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // 다이얼로그 상태
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAdvertisement, setSelectedAdvertisement] = useState<Advertisement | null>(null);

  // 폼 상태
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    linkUrl: '',
    useDetailPage: true,
    detailContent: '',
    businessName: '',
    contactInfo: '',
    position: 'home_banner' as 'home_banner' | 'sidebar' | 'bottom',
    priority: 0,
    startDate: '',
    endDate: '',
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

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

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  useEffect(() => {
    fetchAdvertisements();
  }, [page, rowsPerPage]);

  const fetchAdvertisements = async () => {
    try {
      setLoading(true);
      
      const response = await apiClient.get<ApiResponse<Advertisement[]>>(
        `/api/advertisements?page=${page + 1}&limit=${rowsPerPage}`
      );

      if (response.data.success) {
        setAdvertisements(response.data.data);
        setTotalCount(response.data.pagination?.total || 0);
      }
    } catch (error) {
      showSnackbar('광고 목록 조회에 실패했습니다.', 'error');
      console.error('광고 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateAdvertisement = async () => {
    try {
      if (!selectedFile) {
        showSnackbar('이미지를 선택해주세요.', 'error');
        return;
      }

      const formDataToSend = new FormData();
      
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('linkUrl', formData.linkUrl);
      formDataToSend.append('useDetailPage', formData.useDetailPage.toString());
      formDataToSend.append('detailContent', formData.detailContent);
      formDataToSend.append('businessName', formData.businessName);
      formDataToSend.append('contactInfo', formData.contactInfo);
      formDataToSend.append('position', formData.position);
      formDataToSend.append('priority', formData.priority.toString());
      formDataToSend.append('image', selectedFile);
      
      if (formData.startDate) {
        formDataToSend.append('startDate', formData.startDate);
      }
      if (formData.endDate) {
        formDataToSend.append('endDate', formData.endDate);
      }

      await apiClient.post('/api/advertisements', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      showSnackbar('광고가 성공적으로 생성되었습니다.', 'success');
      setCreateDialogOpen(false);
      resetFormData();
      fetchAdvertisements();
    } catch (error: any) {
      const message = error.response?.data?.error || '광고 생성에 실패했습니다.';
      showSnackbar(message, 'error');
      console.error('광고 생성 실패:', error);
    }
  };

  const handleUpdateAdvertisement = async () => {
    try {
      if (!selectedAdvertisement) return;

      const formDataToSend = new FormData();
      
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('linkUrl', formData.linkUrl);
      formDataToSend.append('useDetailPage', formData.useDetailPage.toString());
      formDataToSend.append('detailContent', formData.detailContent);
      formDataToSend.append('businessName', formData.businessName);
      formDataToSend.append('contactInfo', formData.contactInfo);
      formDataToSend.append('position', formData.position);
      formDataToSend.append('priority', formData.priority.toString());
      
      if (selectedFile) {
        formDataToSend.append('image', selectedFile);
      }
      
      if (formData.startDate) {
        formDataToSend.append('startDate', formData.startDate);
      }
      if (formData.endDate) {
        formDataToSend.append('endDate', formData.endDate);
      }

      await apiClient.put(`/api/advertisements/${selectedAdvertisement.id}`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      showSnackbar('광고가 성공적으로 수정되었습니다.', 'success');
      setEditDialogOpen(false);
      resetFormData();
      fetchAdvertisements();
    } catch (error: any) {
      const message = error.response?.data?.error || '광고 수정에 실패했습니다.';
      showSnackbar(message, 'error');
      console.error('광고 수정 실패:', error);
    }
  };

  const handleDeleteAdvertisement = async () => {
    try {
      if (!selectedAdvertisement) return;

      await apiClient.delete(`/api/advertisements/${selectedAdvertisement.id}`);

      showSnackbar('광고가 성공적으로 삭제되었습니다.', 'success');
      setDeleteDialogOpen(false);
      setSelectedAdvertisement(null);
      fetchAdvertisements();
    } catch (error: any) {
      const message = error.response?.data?.error || '광고 삭제에 실패했습니다.';
      showSnackbar(message, 'error');
      console.error('광고 삭제 실패:', error);
    }
  };

  const handleToggleAdvertisement = async (advertisement: Advertisement) => {
    try {
      await apiClient.patch(`/api/advertisements/${advertisement.id}/toggle`, {});

      showSnackbar(
        `광고가 ${advertisement.isActive ? '비활성화' : '활성화'}되었습니다.`,
        'success'
      );
      fetchAdvertisements();
    } catch (error: any) {
      const message = error.response?.data?.error || '광고 상태 변경에 실패했습니다.';
      showSnackbar(message, 'error');
      console.error('광고 상태 변경 실패:', error);
    }
  };

  const openCreateDialog = () => {
    resetFormData();
    setCreateDialogOpen(true);
  };

  const openEditDialog = (advertisement: Advertisement) => {
    setSelectedAdvertisement(advertisement);
    setFormData({
      title: advertisement.title,
      description: advertisement.description,
      linkUrl: advertisement.linkUrl,
      useDetailPage: advertisement.useDetailPage,
      detailContent: advertisement.detailContent || '',
      businessName: advertisement.businessName || '',
      contactInfo: advertisement.contactInfo || '',
      position: advertisement.position,
      priority: advertisement.priority,
      startDate: advertisement.startDate ? new Date(advertisement.startDate).toISOString().split('T')[0] : '',
      endDate: advertisement.endDate ? new Date(advertisement.endDate).toISOString().split('T')[0] : '',
    });
    setImagePreview(getImageUrl(advertisement.imageUrl));
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (advertisement: Advertisement) => {
    setSelectedAdvertisement(advertisement);
    setDeleteDialogOpen(true);
  };

  const resetFormData = () => {
    setFormData({
      title: '',
      description: '',
      linkUrl: '',
      useDetailPage: true,
      detailContent: '',
      businessName: '',
      contactInfo: '',
      position: 'home_banner',
      priority: 0,
      startDate: '',
      endDate: '',
    });
    setSelectedFile(null);
    setImagePreview(null);
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const getPositionText = (position: string) => {
    switch (position) {
      case 'home_banner':
        return '홈 배너';
      case 'sidebar':
        return '사이드바';
      case 'bottom':
        return '하단';
      default:
        return position;
    }
  };

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'home_banner':
        return 'primary';
      case 'sidebar':
        return 'secondary';
      case 'bottom':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        광고 관리
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">광고 목록</Typography>
            <Box>
              <IconButton onClick={fetchAdvertisements} sx={{ mr: 1 }}>
                <RefreshIcon />
              </IconButton>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={openCreateDialog}
                sx={{ backgroundColor: '#C9B59C' }}
              >
                광고 추가
              </Button>
            </Box>
          </Box>

          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>이미지</TableCell>
                      <TableCell>제목</TableCell>
                      <TableCell>위치</TableCell>
                      <TableCell>우선순위</TableCell>
                      <TableCell>클릭/노출</TableCell>
                      <TableCell>상태</TableCell>
                      <TableCell>생성일</TableCell>
                      <TableCell>작업</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {advertisements.map((advertisement) => {
                      const imageUrl = getImageUrl(advertisement.imageUrl);
                      
                      return (
                        <TableRow key={advertisement.id}>
                          <TableCell>
                            <Avatar
                              src={imageUrl}
                              variant="rounded"
                              sx={{ width: 60, height: 40 }}
                            >
                              <ImageIcon />
                            </Avatar>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">
                              {advertisement.title}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {advertisement.description}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={getPositionText(advertisement.position)}
                              color={getPositionColor(advertisement.position) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{advertisement.priority}</TableCell>
                          <TableCell>
                            {advertisement.clickCount} / {advertisement.viewCount}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={advertisement.isActive}
                              onChange={() => handleToggleAdvertisement(advertisement)}
                              color="primary"
                            />
                          </TableCell>
                          <TableCell>
                            {new Date(advertisement.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => openEditDialog(advertisement)}
                              sx={{ mr: 1 }}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => openDeleteDialog(advertisement)}
                              color="error"
                              sx={{ mr: 1 }}
                            >
                              <DeleteIcon />
                            </IconButton>
                            {advertisement.linkUrl && (
                              <IconButton
                                size="small"
                                onClick={() => window.open(advertisement.linkUrl, '_blank')}
                              >
                                <LaunchIcon />
                              </IconButton>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={totalCount}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* 광고 생성 다이얼로그 */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>새 광고 추가</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="광고 제목"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="광고 설명"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            multiline
            rows={3}
            sx={{ mb: 2 }}
          />

          <Box sx={{ mb: 2 }}>
            <FormControl fullWidth>
              <InputLabel>페이지 유형</InputLabel>
              <Select
                value={formData.useDetailPage ? 'detail' : 'external'}
                label="페이지 유형"
                onChange={(e) => setFormData({ 
                  ...formData, 
                  useDetailPage: e.target.value === 'detail' 
                })}
              >
                <MenuItem value="detail">디테일 페이지</MenuItem>
                <MenuItem value="external">외부 링크</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {!formData.useDetailPage && (
            <TextField
              fullWidth
              label="링크 URL"
              value={formData.linkUrl}
              onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
              placeholder="https://example.com"
              sx={{ mb: 2 }}
            />
          )}

          {formData.useDetailPage && (
            <>
              <TextField
                fullWidth
                label="사업체명"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="연락처 정보"
                value={formData.contactInfo}
                onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
                placeholder="전화번호, 이메일 등"
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="상세 내용"
                value={formData.detailContent}
                onChange={(e) => setFormData({ ...formData, detailContent: e.target.value })}
                multiline
                rows={6}
                placeholder="광고의 상세 내용을 작성하세요. HTML 태그 사용 가능합니다."
                helperText="HTML 태그를 사용하여 풍부한 내용을 작성할 수 있습니다."
                sx={{ mb: 2 }}
              />
            </>
          )}

          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <FormControl fullWidth>
              <InputLabel>표시 위치</InputLabel>
              <Select
                value={formData.position}
                label="표시 위치"
                onChange={(e) => setFormData({ ...formData, position: e.target.value as any })}
              >
                <MenuItem value="home_banner">홈 배너</MenuItem>
                <MenuItem value="sidebar">사이드바</MenuItem>
                <MenuItem value="bottom">하단</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              type="number"
              label="우선순위"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
              helperText="높을수록 먼저 표시됩니다"
            />
          </Stack>

          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <TextField
              fullWidth
              type="date"
              label="시작 날짜"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              fullWidth
              type="date"
              label="종료 날짜"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>

          <input
            accept="image/*"
            style={{ display: 'none' }}
            id="image-upload"
            type="file"
            onChange={handleFileSelect}
          />
          <label htmlFor="image-upload">
            <Button
              variant="outlined"
              component="span"
              startIcon={<PhotoCamera />}
              fullWidth
              sx={{ mb: 2 }}
            >
              이미지 업로드
            </Button>
          </label>
          
          {imagePreview && (
            <Box mt={2}>
              <img
                src={imagePreview}
                alt="미리보기"
                style={{
                  width: '100%',
                  maxHeight: '200px',
                  objectFit: 'cover',
                  borderRadius: '8px',
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>취소</Button>
          <Button onClick={handleCreateAdvertisement} variant="contained">
            생성
          </Button>
        </DialogActions>
      </Dialog>

      {/* 광고 수정 다이얼로그 */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>광고 수정</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="광고 제목"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="광고 설명"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            multiline
            rows={3}
            sx={{ mb: 2 }}
          />

          <Box sx={{ mb: 2 }}>
            <FormControl fullWidth>
              <InputLabel>페이지 유형</InputLabel>
              <Select
                value={formData.useDetailPage ? 'detail' : 'external'}
                label="페이지 유형"
                onChange={(e) => setFormData({ 
                  ...formData, 
                  useDetailPage: e.target.value === 'detail' 
                })}
              >
                <MenuItem value="detail">디테일 페이지</MenuItem>
                <MenuItem value="external">외부 링크</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {!formData.useDetailPage && (
            <TextField
              fullWidth
              label="링크 URL"
              value={formData.linkUrl}
              onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
              placeholder="https://example.com"
              sx={{ mb: 2 }}
            />
          )}

          {formData.useDetailPage && (
            <>
              <TextField
                fullWidth
                label="사업체명"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="연락처 정보"
                value={formData.contactInfo}
                onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
                placeholder="전화번호, 이메일 등"
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="상세 내용"
                value={formData.detailContent}
                onChange={(e) => setFormData({ ...formData, detailContent: e.target.value })}
                multiline
                rows={6}
                placeholder="광고의 상세 내용을 작성하세요. HTML 태그 사용 가능합니다."
                helperText="HTML 태그를 사용하여 풍부한 내용을 작성할 수 있습니다."
                sx={{ mb: 2 }}
              />
            </>
          )}

          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <FormControl fullWidth>
              <InputLabel>표시 위치</InputLabel>
              <Select
                value={formData.position}
                label="표시 위치"
                onChange={(e) => setFormData({ ...formData, position: e.target.value as any })}
              >
                <MenuItem value="home_banner">홈 배너</MenuItem>
                <MenuItem value="sidebar">사이드바</MenuItem>
                <MenuItem value="bottom">하단</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              type="number"
              label="우선순위"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
              helperText="높을수록 먼저 표시됩니다"
            />
          </Stack>

          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <TextField
              fullWidth
              type="date"
              label="시작 날짜"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              fullWidth
              type="date"
              label="종료 날짜"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>

          <input
            accept="image/*"
            style={{ display: 'none' }}
            id="image-upload-edit"
            type="file"
            onChange={handleFileSelect}
          />
          <label htmlFor="image-upload-edit">
            <Button
              variant="outlined"
              component="span"
              startIcon={<PhotoCamera />}
              fullWidth
              sx={{ mb: 2 }}
            >
              이미지 변경 (선택사항)
            </Button>
          </label>
          
          {imagePreview && (
            <Box mt={2}>
              <img
                src={imagePreview}
                alt="미리보기"
                style={{
                  width: '100%',
                  maxHeight: '200px',
                  objectFit: 'cover',
                  borderRadius: '8px',
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>취소</Button>
          <Button onClick={handleUpdateAdvertisement} variant="contained">
            수정
          </Button>
        </DialogActions>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>광고 삭제</DialogTitle>
        <DialogContent>
          <Typography>
            "{selectedAdvertisement?.title}" 광고를 정말 삭제하시겠습니까?
            이 작업은 되돌릴 수 없습니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>취소</Button>
          <Button onClick={handleDeleteAdvertisement} variant="contained" color="error">
            삭제
          </Button>
        </DialogActions>
      </Dialog>

      {/* 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdvertisementManagement;