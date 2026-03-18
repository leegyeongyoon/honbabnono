import React, { useState, useEffect, useCallback } from 'react';
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
  Button,
  Chip,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Card,
  CardContent,
  CircularProgress,
  Tab,
  Tabs,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TablePagination,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import MoneyOffIcon from '@mui/icons-material/MoneyOff';
import PaidIcon from '@mui/icons-material/Paid';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RefundIcon from '@mui/icons-material/Undo';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import apiClient from '../utils/api';

interface Deposit {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  meetup_id: string;
  meetup_title: string;
  amount: number;
  status: 'pending' | 'paid' | 'refunded' | 'forfeited';
  created_at: string;
  updated_at: string;
}

interface DepositStats {
  total: number;
  pending: number;
  paid: number;
  refunded: number;
  forfeited: number;
  total_paid_amount: number;
  total_refunded_amount: number;
  total_forfeited_amount: number;
}

interface Revenue {
  id: string;
  type: string;
  amount: number;
  description: string;
  related_user_id?: string;
  related_meetup_id?: string;
  created_at: string;
}

interface RevenueStats {
  total_revenue: number;
  noshow_revenue: number;
  cancel_revenue: number;
  service_revenue: number;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const DepositManagement: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [depositStats, setDepositStats] = useState<DepositStats | null>(null);
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [revenueStats, setRevenueStats] = useState<RevenueStats | null>(null);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [revenuePagination, setRevenuePagination] = useState<Pagination>({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  const fetchDeposits = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
        status: statusFilter,
        search: searchTerm,
      });
      const response = await apiClient.get(`/api/admin/deposits?${params}`);
      const data = response.data as any;
      setDeposits(data.deposits || []);
      if (data.pagination) {
        setPagination(prev => ({ ...prev, ...data.pagination }));
      }
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: '예치금 목록을 불러오는데 실패했습니다.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter, searchTerm]);

  const fetchDepositStats = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/admin/deposits/stats');
      const data = response.data as any;
      setDepositStats(data.data || null);
    } catch {
      // Stats failure is non-critical
    }
  }, []);

  const fetchRevenues = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(revenuePagination.page),
        limit: String(revenuePagination.limit),
      });
      const response = await apiClient.get(`/api/admin/revenue?${params}`);
      const data = response.data as any;
      setRevenues(data.revenues || []);
      setRevenueStats(data.stats || null);
      if (data.pagination) {
        setRevenuePagination(prev => ({ ...prev, ...data.pagination }));
      }
    } catch {
      setSnackbar({
        open: true,
        message: '수익 데이터를 불러오는데 실패했습니다.',
        severity: 'error',
      });
    }
  }, [revenuePagination.page, revenuePagination.limit]);

  useEffect(() => {
    fetchDepositStats();
  }, [fetchDepositStats]);

  useEffect(() => {
    if (tabValue === 0) {
      fetchDeposits();
    } else {
      fetchRevenues();
    }
  }, [tabValue, fetchDeposits, fetchRevenues]);

  const handleRefund = async () => {
    if (!selectedDeposit) return;

    try {
      await apiClient.post(`/api/admin/deposits/${selectedDeposit.id}/refund`);
      setRefundDialogOpen(false);
      setSelectedDeposit(null);
      setSnackbar({
        open: true,
        message: '환불이 성공적으로 처리되었습니다.',
        severity: 'success',
      });
      fetchDeposits();
      fetchDepositStats();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || '환불 처리 중 오류가 발생했습니다.',
        severity: 'error',
      });
    }
  };

  const getStatusColor = (status: string): 'default' | 'warning' | 'success' | 'info' | 'error' => {
    switch (status) {
      case 'pending': return 'warning';
      case 'paid': return 'success';
      case 'refunded': return 'info';
      case 'forfeited': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'pending': return '대기';
      case 'paid': return '결제완료';
      case 'refunded': return '환불됨';
      case 'forfeited': return '몰수';
      default: return status;
    }
  };

  const getRevenueTypeText = (type: string): string => {
    switch (type) {
      case 'noshow': return '노쇼';
      case 'cancel': return '취소';
      case 'service': return '서비스';
      default: return type;
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        예치금 관리
      </Typography>

      {/* Stats Cards */}
      {depositStats && (
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <AccountBalanceWalletIcon sx={{ fontSize: 40, color: '#C9B59C' }} />
              <Box>
                <Typography variant="body2" color="text.secondary">전체 예치금</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>{depositStats.total}</Typography>
                <Typography variant="caption" color="text.secondary">
                  대기 {depositStats.pending}건
                </Typography>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <PaidIcon sx={{ fontSize: 40, color: '#2E7D32' }} />
              <Box>
                <Typography variant="body2" color="text.secondary">결제 금액</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  ₩{depositStats.total_paid_amount.toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {depositStats.paid}건
                </Typography>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <RefundIcon sx={{ fontSize: 40, color: '#0288D1' }} />
              <Box>
                <Typography variant="body2" color="text.secondary">환불 금액</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  ₩{depositStats.total_refunded_amount.toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {depositStats.refunded}건
                </Typography>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <MoneyOffIcon sx={{ fontSize: 40, color: '#D32F2F' }} />
              <Box>
                <Typography variant="body2" color="text.secondary">몰수 금액</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  ₩{depositStats.total_forfeited_amount.toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {depositStats.forfeited}건
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="예치금 관리" />
          <Tab label="수익 내역" />
        </Tabs>
      </Box>

      {/* Deposits Tab */}
      {tabValue === 0 && (
        <>
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <TextField
              placeholder="사용자 이름/이메일 검색..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ width: 300 }}
              size="small"
            />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>상태 필터</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                label="상태 필터"
              >
                <MenuItem value="all">전체</MenuItem>
                <MenuItem value="pending">대기</MenuItem>
                <MenuItem value="paid">결제완료</MenuItem>
                <MenuItem value="refunded">환불됨</MenuItem>
                <MenuItem value="forfeited">몰수</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress sx={{ color: '#C9B59C' }} />
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>사용자</TableCell>
                    <TableCell>모임</TableCell>
                    <TableCell align="right">금액</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell>결제일</TableCell>
                    <TableCell>관리</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {deposits.length > 0 ? (
                    deposits.map((deposit) => (
                      <TableRow key={deposit.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {deposit.user_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {deposit.user_email}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                            {deposit.meetup_title}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            ₩{deposit.amount.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusText(deposit.status)}
                            color={getStatusColor(deposit.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(deposit.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {deposit.status === 'paid' && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="info"
                              startIcon={<RefundIcon />}
                              onClick={() => {
                                setSelectedDeposit(deposit);
                                setRefundDialogOpen(true);
                              }}
                              sx={{ textTransform: 'none' }}
                            >
                              환불
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">예치금 내역이 없습니다.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <TablePagination
                component="div"
                count={pagination.total}
                page={pagination.page - 1}
                rowsPerPage={pagination.limit}
                onPageChange={(_, newPage) => setPagination(prev => ({ ...prev, page: newPage + 1 }))}
                onRowsPerPageChange={(e) => setPagination(prev => ({ ...prev, limit: parseInt(e.target.value, 10), page: 1 }))}
                rowsPerPageOptions={[10, 20, 50]}
                labelRowsPerPage="페이지당 행:"
              />
            </TableContainer>
          )}
        </>
      )}

      {/* Revenue Tab */}
      {tabValue === 1 && (
        <>
          {revenueStats && (
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
              gap: 2,
              mb: 3,
            }}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">총 수익</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    ₩{revenueStats.total_revenue.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">노쇼 수익</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#D32F2F' }}>
                    ₩{revenueStats.noshow_revenue.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">취소 수익</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#ED6C02' }}>
                    ₩{revenueStats.cancel_revenue.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">서비스 수익</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#2E7D32' }}>
                    ₩{revenueStats.service_revenue.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          )}

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>유형</TableCell>
                  <TableCell>설명</TableCell>
                  <TableCell align="right">금액</TableCell>
                  <TableCell>일시</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {revenues.length > 0 ? (
                  revenues.map((revenue) => (
                    <TableRow key={revenue.id} hover>
                      <TableCell>
                        <Chip
                          label={getRevenueTypeText(revenue.type)}
                          size="small"
                          sx={{
                            backgroundColor: revenue.type === 'noshow' ? '#FFEBEE' :
                              revenue.type === 'cancel' ? '#FFF3E0' : '#E8F5E9',
                            color: revenue.type === 'noshow' ? '#D32F2F' :
                              revenue.type === 'cancel' ? '#ED6C02' : '#2E7D32',
                          }}
                        />
                      </TableCell>
                      <TableCell>{revenue.description}</TableCell>
                      <TableCell align="right">
                        <Typography sx={{ fontWeight: 600 }}>
                          ₩{revenue.amount.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {new Date(revenue.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">수익 내역이 없습니다.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={revenuePagination.total}
              page={revenuePagination.page - 1}
              rowsPerPage={revenuePagination.limit}
              onPageChange={(_, newPage) => setRevenuePagination(prev => ({ ...prev, page: newPage + 1 }))}
              onRowsPerPageChange={(e) => setRevenuePagination(prev => ({ ...prev, limit: parseInt(e.target.value, 10), page: 1 }))}
              rowsPerPageOptions={[10, 20, 50]}
              labelRowsPerPage="페이지당 행:"
            />
          </TableContainer>
        </>
      )}

      {/* Refund Confirmation Dialog */}
      <Dialog open={refundDialogOpen} onClose={() => setRefundDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <WarningAmberIcon sx={{ color: '#ED6C02' }} />
            환불 확인
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedDeposit && (
            <Box sx={{ pt: 1 }}>
              <Alert severity="warning" sx={{ mb: 2 }}>
                이 작업은 되돌릴 수 없습니다. 신중하게 진행해주세요.
              </Alert>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                <Typography variant="body2" color="text.secondary">사용자:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{selectedDeposit.user_name}</Typography>
                <Typography variant="body2" color="text.secondary">모임:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{selectedDeposit.meetup_title}</Typography>
                <Typography variant="body2" color="text.secondary">환불 금액:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#D32F2F' }}>
                  ₩{selectedDeposit.amount.toLocaleString()}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRefundDialogOpen(false)}>취소</Button>
          <Button
            onClick={handleRefund}
            variant="contained"
            sx={{
              backgroundColor: '#C9B59C',
              '&:hover': { backgroundColor: '#A08B7A' },
            }}
          >
            환불 처리
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

export default DepositManagement;
