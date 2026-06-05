import React, { useEffect, useState, useCallback } from 'react';
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
  Button,
  Chip,
  Card,
  Grid,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import StoreIcon from '@mui/icons-material/Store';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PersonIcon from '@mui/icons-material/Person';
import DescriptionIcon from '@mui/icons-material/Description';
import VisibilityIcon from '@mui/icons-material/Visibility';
import apiClient from '../utils/api';
import { MERCHANT_STATUS, resolveStatus } from '../theme';
import { formatDateTime, formatBizNumber } from '../utils/format';
import { PageHeader, EmptyState, StatCard, LoadingSkeleton, StatusChip, ResponsiveTableContainer } from './common';

interface Merchant {
  id: string;
  user_id: string;
  business_number: string;
  business_name: string;
  representative_name: string;
  bank_name: string;
  bank_account: string;
  bank_holder: string;
  verification_status: string;
  verification_docs?: Record<string, string>;
  rejection_reason?: string;
  // 국세청 진위확인 결과 (참고 신호 — 최종 게이트는 verification_status)
  nts_status?: string | null; // nts_passed | nts_failed | null(미조회)
  nts_b_stt?: string | null; // 계속사업자 | 휴업자 | 폐업자
  nts_valid?: boolean | null;
  nts_checked_at?: string | null;
  business_start_date?: string | null;
  restaurant_id?: string;
  restaurant_name?: string;
  username?: string;
  email?: string;
  phone_number?: string;
  created_at: string;
  updated_at: string;
}

interface Counts {
  pending: number;
  verified: number;
  rejected: number;
  total: number;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  business_license: '사업자등록증',
  business_permit: '영업신고증',
  bank_account_copy: '통장사본',
};

// 국세청 진위확인 뱃지 구성
const ntsChip = (m: Merchant): { label: string; color: 'success' | 'error' | 'default' } => {
  if (m.nts_status === 'nts_passed') return { label: `국세청 확인 ✓ (${m.nts_b_stt || '계속사업자'})`, color: 'success' };
  if (m.nts_status === 'nts_failed') {
    const reason = m.nts_valid === false ? '정보 불일치' : (m.nts_b_stt || '휴폐업');
    return { label: `국세청 확인 ✗ (${reason})`, color: 'error' };
  }
  return { label: '국세청 미조회', color: 'default' };
};

const MerchantManagement: React.FC = () => {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [counts, setCounts] = useState<Counts>({ pending: 0, verified: 0, rejected: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [tabIndex, setTabIndex] = useState(0); // 0=전체, 1=대기, 2=승인, 3=거절
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Verify dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<'verified' | 'rejected'>('verified');
  const [dialogTarget, setDialogTarget] = useState<Merchant | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Detail dialog (document preview)
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailMerchant, setDetailMerchant] = useState<Merchant | null>(null);

  // Image preview dialog
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');

  const statusFilter = ['all', 'pending', 'verified', 'rejected'][tabIndex];

  const fetchMerchants = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = { status: statusFilter };
      if (search) params.search = search;
      const res: any = await apiClient.get('/api/admin/merchants', { params });
      setMerchants(res.data.merchants || []);
      setCounts(res.data.counts || { pending: 0, verified: 0, rejected: 0, total: 0 });
    } catch (err: any) {
      setError(err.response?.data?.error || '점주 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchMerchants();
  }, [fetchMerchants]);

  const openVerifyDialog = (merchant: Merchant, action: 'verified' | 'rejected') => {
    setDialogTarget(merchant);
    setDialogAction(action);
    setRejectReason('');
    setDialogOpen(true);
  };

  const openDetailDialog = (merchant: Merchant) => {
    setDetailMerchant(merchant);
    setDetailOpen(true);
  };

  const handleVerify = async () => {
    if (!dialogTarget) return;
    try {
      const payload: Record<string, string> = { status: dialogAction };
      if (dialogAction === 'rejected' && rejectReason.trim()) {
        payload.reject_reason = rejectReason.trim();
      }
      await apiClient.patch(`/api/admin/merchants/${dialogTarget.id}/verify`, payload);
      setSnackbar({
        open: true,
        message: dialogAction === 'verified' ? '점주가 승인되었습니다.' : '점주 신청이 거절되었습니다.',
        severity: 'success',
      });
      setDialogOpen(false);
      fetchMerchants();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.response?.data?.error || '처리에 실패했습니다.',
        severity: 'error',
      });
    }
  };

  const hasDocuments = (merchant: Merchant) => {
    const docs = merchant.verification_docs;
    return docs && typeof docs === 'object' && Object.keys(docs).length > 0;
  };

  return (
    <Box>
      <PageHeader title="점주 관리" />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Summary cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: '전체 점주', count: counts.total, icon: <StoreIcon />, color: 'primary' as const },
          { label: '승인 대기', count: counts.pending, icon: <HourglassEmptyIcon />, color: 'warning' as const },
          { label: '승인됨', count: counts.verified, icon: <CheckCircleIcon />, color: 'success' as const },
          { label: '거절됨', count: counts.rejected, icon: <CancelIcon />, color: 'error' as const },
        ].map((item) => (
          <Grid size={{ xs: 6, md: 3 }} key={item.label}>
            <StatCard label={item.label} value={item.count} icon={item.icon} color={item.color} />
          </Grid>
        ))}
      </Grid>

      {/* Tabs + Search */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)}>
            <Tab label={`전체 (${counts.total})`} />
            <Tab label={`대기 (${counts.pending})`} />
            <Tab label={`승인 (${counts.verified})`} />
            <Tab label={`거절 (${counts.rejected})`} />
          </Tabs>
        </Box>

        <Box sx={{ p: 2 }}>
          <TextField
            size="small"
            placeholder="상호명, 사업자번호, 이메일 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') fetchMerchants(); }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
            sx={{ width: { xs: '100%', sm: 360 } }}
          />
        </Box>

        {/* Table */}
        {loading ? (
          <LoadingSkeleton variant="table" columns={9} />
        ) : merchants.length === 0 ? (
          <EmptyState
            icon={<StoreIcon />}
            title={tabIndex === 1 ? '승인 대기 중인 점주가 없습니다.' : '등록된 점주가 없습니다.'}
          />
        ) : (
          <ResponsiveTableContainer minWidth={960}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>상호명</TableCell>
                  <TableCell>사업자번호</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>대표자</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>계정 정보</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>매장</TableCell>
                  <TableCell align="center" sx={{ display: { xs: 'none', md: 'table-cell' } }}>서류</TableCell>
                  <TableCell align="center">상태</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>신청일</TableCell>
                  <TableCell align="center">관리</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {merchants.map((m) => {
                  return (
                    <TableRow key={m.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{m.business_name || '-'}</TableCell>
                      <TableCell>{formatBizNumber(m.business_number)}</TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{m.representative_name || '-'}</TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PersonIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                          <Box>
                            <Typography variant="body2">{m.username || '-'}</Typography>
                            <Typography variant="caption" color="text.secondary">{m.email || ''}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        {m.restaurant_name ? (
                          <Chip label={m.restaurant_name} size="small" variant="outlined" />
                        ) : (
                          <Typography variant="body2" color="text.secondary">미등록</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        {hasDocuments(m) ? (
                          <Tooltip title="서류 보기">
                            <Button
                              size="small"
                              variant="text"
                              onClick={() => openDetailDialog(m)}
                              sx={{ minWidth: 0, p: 0.5 }}
                            >
                              <DescriptionIcon sx={{ fontSize: 20 }} />
                            </Button>
                          </Tooltip>
                        ) : (
                          <Typography variant="caption" color="text.secondary">없음</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <StatusChip status={m.verification_status} map={MERCHANT_STATUS} />
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        <Typography variant="body2">{formatDateTime(m.created_at)}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', alignItems: 'center' }}>
                          <Tooltip title="상세보기">
                            <Button
                              size="small"
                              variant="text"
                              onClick={() => openDetailDialog(m)}
                              sx={{ minWidth: 0, px: 0.5 }}
                            >
                              <VisibilityIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                            </Button>
                          </Tooltip>
                          {m.verification_status === 'pending' && (
                            <>
                              <Tooltip title="승인">
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="success"
                                  onClick={() => openVerifyDialog(m, 'verified')}
                                  sx={{ minWidth: 0, px: 1.5 }}
                                >
                                  승인
                                </Button>
                              </Tooltip>
                              <Tooltip title="거절">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  onClick={() => openVerifyDialog(m, 'rejected')}
                                  sx={{ minWidth: 0, px: 1.5 }}
                                >
                                  거절
                                </Button>
                              </Tooltip>
                            </>
                          )}
                          {m.verification_status === 'verified' && (
                            <Typography variant="body2" color="success.main">승인 완료</Typography>
                          )}
                          {m.verification_status === 'rejected' && (
                            <Tooltip title="재승인">
                              <Button
                                size="small"
                                variant="outlined"
                                color="primary"
                                onClick={() => openVerifyDialog(m, 'verified')}
                                sx={{ minWidth: 0, px: 1.5 }}
                              >
                                재승인
                              </Button>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ResponsiveTableContainer>
        )}
      </Card>

      {/* Detail Dialog (Document Preview) */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>점주 상세 정보</DialogTitle>
        <DialogContent>
          {detailMerchant && (
            <Box>
              {/* Basic info */}
              <Box sx={{ backgroundColor: 'background.default', borderRadius: 2, p: 2, mb: 3 }}>
                <Typography variant="body2"><strong>상호명:</strong> {detailMerchant.business_name || '-'}</Typography>
                <Typography variant="body2"><strong>사업자번호:</strong> {formatBizNumber(detailMerchant.business_number)}</Typography>
                <Typography variant="body2"><strong>대표자:</strong> {detailMerchant.representative_name || '-'}</Typography>
                <Typography variant="body2"><strong>계정:</strong> {detailMerchant.username} ({detailMerchant.email})</Typography>
                {detailMerchant.bank_name && (
                  <Typography variant="body2"><strong>정산계좌:</strong> {detailMerchant.bank_name} {detailMerchant.bank_account} ({detailMerchant.bank_holder})</Typography>
                )}
                {detailMerchant.business_start_date && (
                  <Typography variant="body2"><strong>개업일자:</strong> {formatDateTime(detailMerchant.business_start_date)}</Typography>
                )}
                <Typography variant="body2"><strong>신청일:</strong> {formatDateTime(detailMerchant.created_at)}</Typography>
                <Typography variant="body2" component="div" sx={{ mt: 0.5 }}>
                  <strong>상태:</strong>{' '}
                  <Chip
                    label={resolveStatus(MERCHANT_STATUS, detailMerchant.verification_status).label}
                    color={resolveStatus(MERCHANT_STATUS, detailMerchant.verification_status).color}
                    size="small"
                  />
                  {' '}
                  <Chip label={ntsChip(detailMerchant).label} color={ntsChip(detailMerchant).color} size="small" variant="outlined" />
                </Typography>
                {detailMerchant.rejection_reason && (
                  <Typography variant="body2" sx={{ mt: 1, color: 'error.main' }}>
                    <strong>반려 사유:</strong> {detailMerchant.rejection_reason}
                  </Typography>
                )}
              </Box>

              {/* Document previews */}
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                제출 서류
              </Typography>
              {hasDocuments(detailMerchant) ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {Object.entries(detailMerchant.verification_docs || {}).map(([docType, url]) => (
                    <Box
                      key={docType}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                        p: 1.5,
                        width: 200,
                        textAlign: 'center',
                        cursor: 'pointer',
                        '&:hover': { borderColor: 'primary.main', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
                        transition: 'all 0.2s',
                      }}
                      onClick={() => {
                        if (url && typeof url === 'string') {
                          if (url.endsWith('.pdf')) {
                            window.open(url, '_blank');
                          } else {
                            setImagePreviewUrl(url);
                            setImagePreviewOpen(true);
                          }
                        }
                      }}
                    >
                      {url && typeof url === 'string' && !url.endsWith('.pdf') ? (
                        <Box
                          component="img"
                          src={url}
                          alt={DOC_TYPE_LABELS[docType] || docType}
                          sx={{
                            width: '100%',
                            height: 140,
                            objectFit: 'cover',
                            borderRadius: 1,
                            mb: 1,
                          }}
                          onError={(e: any) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <Box sx={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'background.default', borderRadius: 1, mb: 1 }}>
                          <DescriptionIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                        </Box>
                      )}
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {DOC_TYPE_LABELS[docType] || docType}
                      </Typography>
                      <Typography variant="caption" color="primary">
                        클릭하여 보기
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <EmptyState icon={<DescriptionIcon />} title="제출된 서류가 없습니다." dense />
              )}

              {/* Quick action buttons */}
              {detailMerchant.verification_status === 'pending' && (
                <Box sx={{ display: 'flex', gap: 1.5, mt: 3, justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={() => {
                      setDetailOpen(false);
                      openVerifyDialog(detailMerchant, 'verified');
                    }}
                  >
                    승인
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => {
                      setDetailOpen(false);
                      openVerifyDialog(detailMerchant, 'rejected');
                    }}
                  >
                    거절
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={imagePreviewOpen} onClose={() => setImagePreviewOpen(false)} maxWidth="lg">
        <DialogContent sx={{ p: 1 }}>
          {imagePreviewUrl && (
            <Box
              component="img"
              src={imagePreviewUrl}
              alt="서류 미리보기"
              sx={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (imagePreviewUrl) window.open(imagePreviewUrl, '_blank');
            }}
          >
            원본 보기
          </Button>
          <Button onClick={() => setImagePreviewOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>

      {/* Verify/Reject Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogAction === 'verified' ? '점주 승인 확인' : '점주 거절 확인'}
        </DialogTitle>
        <DialogContent>
          {dialogTarget && (
            <Box>
              <Typography sx={{ mb: 2 }}>
                {dialogAction === 'verified'
                  ? '아래 점주를 승인하시겠습니까? 승인 후 대시보드 접근이 가능해집니다.'
                  : '아래 점주의 신청을 거절하시겠습니까?'}
              </Typography>
              <Box sx={{ backgroundColor: 'background.default', borderRadius: 2, p: 2, mb: 2 }}>
                <Typography variant="body2"><strong>상호명:</strong> {dialogTarget.business_name}</Typography>
                <Typography variant="body2"><strong>사업자번호:</strong> {formatBizNumber(dialogTarget.business_number)}</Typography>
                <Typography variant="body2"><strong>대표자:</strong> {dialogTarget.representative_name}</Typography>
                <Typography variant="body2"><strong>계정:</strong> {dialogTarget.username} ({dialogTarget.email})</Typography>
                {dialogTarget.bank_name && (
                  <Typography variant="body2"><strong>정산계좌:</strong> {dialogTarget.bank_name} {dialogTarget.bank_account} ({dialogTarget.bank_holder})</Typography>
                )}
              </Box>

              {/* Rejection reason input */}
              {dialogAction === 'rejected' && (
                <TextField
                  fullWidth
                  label="반려 사유"
                  placeholder="거절 사유를 입력해주세요 (점주에게 전달됩니다)"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  multiline
                  rows={3}
                  sx={{ mt: 1 }}
                />
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>취소</Button>
          <Button
            onClick={handleVerify}
            variant="contained"
            color={dialogAction === 'verified' ? 'success' : 'error'}
            disabled={dialogAction === 'rejected' && !rejectReason.trim()}
          >
            {dialogAction === 'verified' ? '승인' : '거절'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MerchantManagement;
