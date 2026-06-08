import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  Table,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  Checkbox,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Snackbar,
  Typography,
  SelectChangeEvent,
} from '@mui/material';
import {
  People as PeopleIcon,
  Refresh as RefreshIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import apiClient from '../utils/api';
import getRestaurantId from '../utils/getRestaurantId';
import { PageHeader, EmptyState, LoadingSkeleton } from './common';

// ── Types ──────────────────────────────────────────────────────
interface Regular {
  user_id: string; // UUID
  name: string;
  phone_number?: string;
  visit_count: number;
  last_visit?: string;
  total_spent: number;
}

const MIN_VISITS_OPTIONS = [2, 3, 5];

const EMPTY_NOTIFY = { title: '', message: '' };

const formatDate = (value: string | null | undefined): string => {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value).slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ── Component ──────────────────────────────────────────────────
const RegularCustomers: React.FC = () => {
  const restaurantId = getRestaurantId();

  const [regulars, setRegulars] = useState<Regular[]>([]);
  const [minVisits, setMinVisits] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 다중 선택
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // 메시지 발송 다이얼로그
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyForm, setNotifyForm] = useState({ ...EMPTY_NOTIFY });
  const [sending, setSending] = useState(false);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // ── Fetch ──
  const fetchRegulars = useCallback(async () => {
    if (!restaurantId) return;
    try {
      setLoading(true);
      setError('');
      const res = await apiClient.get('/api/settlements/merchant/regulars', {
        params: { min_visits: minVisits },
      });
      const d = res.data.data ?? res.data;
      const list: Regular[] = d.regulars ?? (Array.isArray(d) ? d : []);
      setRegulars(list);
      // 필터 변경 시 사라진 대상은 선택 해제
      setSelected((prev) => {
        const next = new Set<string>();
        list.forEach((r) => { if (prev.has(r.user_id)) next.add(r.user_id); });
        return next;
      });
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || '단골 고객을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [restaurantId, minVisits]);

  useEffect(() => {
    fetchRegulars();
  }, [fetchRegulars]);

  // ── 선택 토글 ──
  const toggleOne = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const allSelected = regulars.length > 0 && regulars.every((r) => selected.has(r.user_id));
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = () => {
    setSelected((prev) => {
      if (regulars.length > 0 && regulars.every((r) => prev.has(r.user_id))) {
        return new Set();
      }
      return new Set(regulars.map((r) => r.user_id));
    });
  };

  // ── 메시지 발송 ──
  const openNotify = () => {
    if (selected.size === 0) {
      setSnackbar({ open: true, message: '발송할 단골 고객을 선택해주세요.', severity: 'error' });
      return;
    }
    setNotifyForm({ ...EMPTY_NOTIFY });
    setNotifyOpen(true);
  };

  const handleNotifyChange = (field: keyof typeof EMPTY_NOTIFY, value: string) => {
    setNotifyForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSend = async () => {
    if (!notifyForm.title.trim()) {
      setSnackbar({ open: true, message: '제목을 입력해주세요.', severity: 'error' });
      return;
    }
    if (!notifyForm.message.trim()) {
      setSnackbar({ open: true, message: '내용을 입력해주세요.', severity: 'error' });
      return;
    }
    setSending(true);
    try {
      const res = await apiClient.post('/api/settlements/merchant/regulars/notify', {
        user_ids: Array.from(selected),
        title: notifyForm.title.trim(),
        message: notifyForm.message.trim(),
      });
      const d = res.data.data ?? res.data;
      const sent = d.sent ?? 0;
      setNotifyOpen(false);
      setSelected(new Set());
      setSnackbar({ open: true, message: `${sent}명에게 메시지를 발송했습니다.`, severity: 'success' });
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || err.response?.data?.error || '메시지 발송에 실패했습니다.',
        severity: 'error',
      });
    } finally {
      setSending(false);
    }
  };

  // ── 매장 미등록 ──
  if (!restaurantId) {
    return (
      <Box>
        <PageHeader title="단골 관리" />
        <Alert severity="info">
          매장 등록을 먼저 완료해주세요. (매장 정보 탭에서 등록 가능)
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="단골 관리"
        actions={
          <>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>방문 기준</InputLabel>
              <Select
                value={String(minVisits)}
                label="방문 기준"
                onChange={(e: SelectChangeEvent) => setMinVisits(Number(e.target.value))}
              >
                {MIN_VISITS_OPTIONS.map((v) => (
                  <MenuItem key={v} value={String(v)}>{v}회 이상</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button startIcon={<RefreshIcon />} onClick={fetchRegulars} variant="outlined" color="primary" size="small">
              새로고침
            </Button>

            <Button
              startIcon={<SendIcon />}
              onClick={openNotify}
              variant="contained"
              color="primary"
              size="small"
              disabled={selected.size === 0}
            >
              메시지 발송 {selected.size > 0 ? `(${selected.size})` : ''}
            </Button>
          </>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading && regulars.length === 0 && (
        <LoadingSkeleton variant="cards" count={3} />
      )}

      {!loading && regulars.length === 0 && !error && (
        <EmptyState
          icon={<PeopleIcon />}
          title="단골 고객이 없습니다"
          description={`방문 ${minVisits}회 이상 고객이 집계되면 이곳에 표시됩니다.`}
        />
      )}

      {regulars.length > 0 && (
        <Card variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={toggleAll}
                  />
                </TableCell>
                <TableCell>이름</TableCell>
                <TableCell>연락처</TableCell>
                <TableCell align="center">방문수</TableCell>
                <TableCell>마지막 방문</TableCell>
                <TableCell align="right">총 지출</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {regulars.map((r) => {
                const isSel = selected.has(r.user_id);
                return (
                  <TableRow
                    key={r.user_id}
                    hover
                    selected={isSel}
                    onClick={() => toggleOne(r.user_id)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox checked={isSel} onChange={() => toggleOne(r.user_id)} onClick={(e) => e.stopPropagation()} />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{r.name || '익명'}</TableCell>
                    <TableCell>{r.phone_number || '-'}</TableCell>
                    <TableCell align="center">
                      <Chip label={`${r.visit_count}회`} size="small" color="primary" sx={{ fontWeight: 700 }} />
                    </TableCell>
                    <TableCell>{formatDate(r.last_visit)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: 'success.main' }}>
                      {(r.total_spent || 0).toLocaleString()}원
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* 메시지 발송 다이얼로그 */}
      <Dialog open={notifyOpen} onClose={() => !sending && setNotifyOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>단골 메시지 발송</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <Typography variant="body2" color="text.secondary">
            선택한 <strong>{selected.size}</strong>명의 단골 고객에게 알림을 발송합니다.
          </Typography>
          <TextField
            label="제목"
            value={notifyForm.title}
            required
            fullWidth
            inputProps={{ maxLength: 60 }}
            onChange={(e) => handleNotifyChange('title', e.target.value)}
          />
          <TextField
            label="내용"
            value={notifyForm.message}
            required
            multiline
            rows={4}
            fullWidth
            inputProps={{ maxLength: 500 }}
            onChange={(e) => handleNotifyChange('message', e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotifyOpen(false)} disabled={sending}>취소</Button>
          <Button
            onClick={handleSend}
            variant="contained"
            color="primary"
            startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
            disabled={sending || !notifyForm.title.trim() || !notifyForm.message.trim()}
          >
            발송
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RegularCustomers;
