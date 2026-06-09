import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Alert,
  Snackbar,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  LinearProgress,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import InsightsIcon from '@mui/icons-material/Insights';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PaymentsIcon from '@mui/icons-material/Payments';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import apiClient from '../utils/api';
import { num, formatDateTime } from '../utils/format';
import { PageHeader, StatCard, EmptyState, LoadingSkeleton, ResponsiveTableContainer } from './common';

// ============================================================
// 가짜문(Fake Door) 퍼널 검증 대시보드
// 백엔드: GET /api/admin/funnel?days=&restaurant_ref=&variant=
// 측정 단계: landing_view → menu_view → add_to_cart →
//            reservation_intent → payment_click → lead_submit
// variant = 선결제 형태 A/B (full / deposit / course)
// ============================================================

interface FunnelStep {
  step: string;
  sessions: number;
}

interface Conversions {
  landing_to_payment: number;
  payment_to_lead: number;
  landing_to_lead: number;
}

interface VariantBreakdownRow {
  variant: string;
  step: string;
  sessions: number;
}

interface Lead {
  id: string | number;
  contact: string;
  contact_type: string | null;
  restaurant_ref: string | null;
  variant: string | null;
  note: string | null;
  created_at: string;
}

interface FunnelData {
  days: number;
  funnel: FunnelStep[];
  conversions: Conversions;
  variant_breakdown: VariantBreakdownRow[];
  leads: Lead[];
  lead_count: number;
}

// ── 단계 라벨 (측정 설계와 1:1) ──
const STEP_LABELS: Record<string, string> = {
  landing_view: '랜딩 조회',
  menu_view: '메뉴 열람',
  add_to_cart: '장바구니 담기',
  reservation_intent: '예약 의향',
  payment_click: '결제 클릭',
  lead_submit: '리드 신청',
};

// ── 선결제 형태(variant) 라벨 ──
const VARIANT_LABELS: Record<string, string> = {
  full: '전액 선결제',
  deposit: '예약금 선결제',
  course: '코스 선주문',
};
const variantLabel = (v: string): string => VARIANT_LABELS[v] || v;

// ── 연락처 유형 라벨 ──
const CONTACT_TYPE_LABELS: Record<string, string> = {
  email: '이메일',
  phone: '전화',
  kakao: '카카오',
};

// ── 단계 바 색상 (StatCard 팔레트와 동일 토큰 사용, hex 금지) ──
type PaletteKey = 'primary' | 'info' | 'secondary' | 'success' | 'warning';
const STEP_COLOR: Record<string, PaletteKey> = {
  landing_view: 'primary',
  menu_view: 'info',
  add_to_cart: 'info',
  reservation_intent: 'secondary',
  payment_click: 'warning',
  lead_submit: 'success',
};

const pct1 = (v: number): string => `${v.toFixed(1)}%`;

const FunnelDashboard: React.FC = () => {
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState<7 | 14 | 30>(14);
  const [restaurantRef, setRestaurantRef] = useState('');
  const [variant, setVariant] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const fetchFunnel = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = { days: String(days) };
      if (restaurantRef.trim()) params.restaurant_ref = restaurantRef.trim();
      if (variant) params.variant = variant;
      const res: any = await apiClient.get('/api/admin/funnel', { params });
      const payload = res.data.data ?? res.data;
      setData(payload);
    } catch (err: any) {
      setError(err.response?.data?.error || '퍼널 통계를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [days, restaurantRef, variant]);

  useEffect(() => {
    fetchFunnel();
  }, [fetchFunnel]);

  // 최상단(landing_view) 세션을 100% 기준으로 상대 너비 계산
  const baseSessions = useMemo(() => {
    const top = data?.funnel?.[0]?.sessions ?? 0;
    return top > 0 ? top : 0;
  }, [data]);

  // variant × payment_click / lead_submit 전환율 행 (수용률 비교)
  const variantRows = useMemo(() => {
    if (!data?.variant_breakdown?.length) return [];
    const byVariant: Record<string, Record<string, number>> = {};
    data.variant_breakdown.forEach((r) => {
      if (!byVariant[r.variant]) byVariant[r.variant] = {};
      byVariant[r.variant][r.step] = r.sessions;
    });
    return Object.entries(byVariant)
      .map(([v, steps]) => {
        const landing = steps['landing_view'] || 0;
        const paymentClick = steps['payment_click'] || 0;
        const leadSubmit = steps['lead_submit'] || 0;
        return {
          variant: v,
          landing,
          paymentClick,
          leadSubmit,
          paymentRate: landing > 0 ? (paymentClick / landing) * 100 : 0,
          leadRate: landing > 0 ? (leadSubmit / landing) * 100 : 0,
        };
      })
      .sort((a, b) => b.paymentRate - a.paymentRate);
  }, [data]);

  const maxVariantRate = useMemo(
    () => Math.max(1, ...variantRows.map((r) => r.paymentRate)),
    [variantRows]
  );

  const exportLeadsCsv = () => {
    const leads = data?.leads ?? [];
    if (!leads.length) {
      setSnackbar({ open: true, message: '내보낼 리드가 없습니다.', severity: 'error' });
      return;
    }
    const header = ['ID', '연락처', '유형', '매장ref', '선결제형태', '메모', '신청일시'];
    const escape = (val: unknown): string => {
      const s = val == null ? '' : String(val);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const rows = leads.map((l) =>
      [
        l.id,
        l.contact,
        l.contact_type ? CONTACT_TYPE_LABELS[l.contact_type] || l.contact_type : '',
        l.restaurant_ref || '',
        l.variant ? variantLabel(l.variant) : '',
        l.note || '',
        formatDateTime(l.created_at),
      ]
        .map(escape)
        .join(',')
    );
    // BOM + CSV (엑셀 한글 깨짐 방지)
    const csv = '﻿' + [header.map(escape).join(','), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `잇테이블_퍼널리드_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    setSnackbar({ open: true, message: `리드 ${leads.length}건을 내보냈습니다.`, severity: 'success' });
  };

  // ── 헤더 액션: 기간 토글 + 매장/variant 필터 + 새로고침 ──
  const headerActions = (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={days}
        onChange={(_, v) => { if (v) setDays(v); }}
        color="primary"
      >
        <ToggleButton value={7}>7일</ToggleButton>
        <ToggleButton value={14}>14일</ToggleButton>
        <ToggleButton value={30}>30일</ToggleButton>
      </ToggleButtonGroup>

      <TextField
        size="small"
        label="매장 ref"
        value={restaurantRef}
        onChange={(e) => setRestaurantRef(e.target.value)}
        sx={{ width: 140 }}
      />

      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>선결제 형태</InputLabel>
        <Select label="선결제 형태" value={variant} onChange={(e) => setVariant(e.target.value)}>
          <MenuItem value="">전체</MenuItem>
          <MenuItem value="full">전액 선결제</MenuItem>
          <MenuItem value="deposit">예약금 선결제</MenuItem>
          <MenuItem value="course">코스 선주문</MenuItem>
        </Select>
      </FormControl>

      <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={fetchFunnel}>
        새로고침
      </Button>
    </Box>
  );

  if (loading && !data) {
    return (
      <Box>
        <PageHeader title="퍼널 검증" subtitle="가짜문 랜딩 — 수요·결제의향 측정" actions={headerActions} />
        <LoadingSkeleton variant="dashboard" />
      </Box>
    );
  }

  const funnel = data?.funnel ?? [];
  const conversions = data?.conversions;

  return (
    <Box>
      <PageHeader
        title="퍼널 검증"
        subtitle={`가짜문 랜딩 퍼널 — 최근 ${data?.days ?? days}일 · 리드 ${num(data?.lead_count)}건`}
        actions={headerActions}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* ── 핵심 전환율 StatCard 3개 ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard
            label="랜딩 → 결제클릭 (수요 신호)"
            value={conversions ? pct1(conversions.landing_to_payment) : '-'}
            icon={<TrendingUpIcon />}
            color="warning"
            subtitle="10%+ 강한 수요"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard
            label="결제클릭 → 리드 (결제의향 강도)"
            value={conversions ? pct1(conversions.payment_to_lead) : '-'}
            icon={<PaymentsIcon />}
            color="info"
            subtitle="30%+ 진성 의향"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard
            label="랜딩 → 리드 (전체 전환)"
            value={conversions ? pct1(conversions.landing_to_lead) : '-'}
            icon={<HowToRegIcon />}
            color="success"
            subtitle="3%+ 검증 합격선"
          />
        </Grid>
      </Grid>

      {/* ── 퍼널 깔때기 시각화 (CSS 바) ── */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            전환 퍼널 (단계별 세션)
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            최상단 랜딩 조회를 100% 기준으로 한 상대 폭 · 통과율은 직전 단계 대비
          </Typography>

          {funnel.length === 0 || baseSessions === 0 ? (
            <EmptyState
              icon={<InsightsIcon />}
              title="측정된 퍼널 이벤트가 없습니다."
              description="랜딩 페이지에서 funnel_events가 수집되면 단계별 세션이 표시됩니다."
              dense
            />
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              {funnel.map((s, idx) => {
                const widthPct = (s.sessions / baseSessions) * 100;
                const prev = idx > 0 ? funnel[idx - 1].sessions : s.sessions;
                const stepRate = prev > 0 ? (s.sessions / prev) * 100 : 0;
                const color = STEP_COLOR[s.step] || 'primary';
                return (
                  <Box key={s.step}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {idx + 1}. {STEP_LABELS[s.step] || s.step}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'baseline' }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {num(s.sessions)}
                        </Typography>
                        {idx > 0 && (
                          <Typography
                            variant="caption"
                            sx={{ color: stepRate >= 50 ? 'success.main' : 'text.secondary', minWidth: 56, textAlign: 'right' }}
                          >
                            통과 {stepRate.toFixed(1)}%
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    {/* CSS div 바 — 트랙 위에 채움 (Dashboard CSS 바 패턴) */}
                    <Box
                      sx={{
                        position: 'relative',
                        height: 26,
                        borderRadius: 1,
                        bgcolor: 'background.default',
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: `${Math.max(widthPct, s.sessions > 0 ? 2 : 0)}%`,
                          bgcolor: (t) => alpha(t.palette[color].main, 0.85),
                          borderRadius: 1,
                          transition: 'width 0.4s ease',
                          display: 'flex',
                          alignItems: 'center',
                          pl: 1,
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{ color: `${color}.contrastText`, fontWeight: 700, whiteSpace: 'nowrap' }}
                        >
                          {widthPct.toFixed(1)}%
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ── variant별 수용률 비교 ── */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            선결제 형태별 수용률
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            형태별 랜딩→결제클릭 전환율 비교 — 어떤 선결제 형태의 수용률이 높은지 판단
          </Typography>

          {variantRows.length === 0 ? (
            <EmptyState
              icon={<PaymentsIcon />}
              title="형태별 데이터가 없습니다."
              description="variant가 지정된 funnel_events가 수집되면 비교가 표시됩니다."
              dense
            />
          ) : (
            <ResponsiveTableContainer minWidth={680}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>선결제 형태</TableCell>
                    <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>랜딩</TableCell>
                    <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>결제클릭</TableCell>
                    <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>리드</TableCell>
                    <TableCell sx={{ width: '38%' }}>결제클릭 전환율</TableCell>
                    <TableCell align="right">리드 전환율</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {variantRows.map((r, idx) => (
                    <TableRow key={r.variant} hover>
                      <TableCell sx={{ fontWeight: 600 }}>
                        <Chip
                          label={variantLabel(r.variant)}
                          size="small"
                          color={idx === 0 ? 'primary' : 'default'}
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>{num(r.landing)}</TableCell>
                      <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>{num(r.paymentClick)}</TableCell>
                      <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>{num(r.leadSubmit)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(100, (r.paymentRate / maxVariantRate) * 100)}
                            color={idx === 0 ? 'primary' : 'info'}
                            sx={{ flex: 1, height: 8, borderRadius: 1 }}
                          />
                          <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 44, textAlign: 'right' }}>
                            {pct1(r.paymentRate)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                          {pct1(r.leadRate)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ResponsiveTableContainer>
          )}
        </CardContent>
      </Card>

      {/* ── 리드 목록 ── */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h6">리드 목록</Typography>
              <Typography variant="caption" color="text.secondary">
                최근 {data?.days ?? days}일 · 총 {num(data?.lead_count)}건 (최대 200건)
              </Typography>
            </Box>
            <Button
              size="small"
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={exportLeadsCsv}
              disabled={!data?.leads?.length}
            >
              CSV 내보내기
            </Button>
          </Box>

          {!data?.leads?.length ? (
            <EmptyState
              icon={<PeopleAltIcon />}
              title="신청된 리드가 없습니다."
              description="가짜문 랜딩에서 연락처가 제출되면 여기에 누적됩니다."
              dense
            />
          ) : (
            <ResponsiveTableContainer minWidth={760}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>연락처</TableCell>
                    <TableCell align="center">유형</TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>매장 ref</TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>선결제 형태</TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>메모</TableCell>
                    <TableCell align="right">신청일시</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.leads.map((l) => (
                    <TableRow key={l.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{l.contact}</TableCell>
                      <TableCell align="center">
                        {l.contact_type ? (
                          <Chip label={CONTACT_TYPE_LABELS[l.contact_type] || l.contact_type} size="small" variant="outlined" />
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{l.restaurant_ref || '-'}</TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        {l.variant ? (
                          <Chip label={variantLabel(l.variant)} size="small" color="secondary" />
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, maxWidth: 240 }}>
                        <Typography variant="body2" color="text.secondary" noWrap title={l.note || ''}>
                          {l.note || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">{formatDateTime(l.created_at)}</Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ResponsiveTableContainer>
          )}
        </CardContent>
      </Card>

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

export default FunnelDashboard;
