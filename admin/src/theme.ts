import { createTheme } from '@mui/material/styles';

// ============================================================
// 잇테이블 관리자 패널 — 디자인 시스템 (단일 소스)
// 브랜드: 베이지 (#C9B59C 원색 유지) — 8-step 스케일
// ============================================================

const brand = {
  50:  '#F9F8F6',
  100: '#F1ECE5',
  200: '#E3D8CB',
  300: '#D9CFC7',
  400: '#C9B59C', // 원 브랜드색
  500: '#BFA888',
  600: '#A08B7A',
  700: '#766653',
  800: '#5C4F3A',
  900: '#4C422C',
};

export type ChipColor =
  | 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

export interface StatusDef { label: string; color: ChipColor; }

// ── 도메인 상태색 중앙화 (각 화면 STATUS_CHIPS 통합) ──
export const MERCHANT_STATUS: Record<string, StatusDef> = {
  pending:  { label: '승인 대기', color: 'warning' },
  verified: { label: '승인됨',   color: 'success' },
  rejected: { label: '거절됨',   color: 'error' },
};

export const RESERVATION_STATUS: Record<string, StatusDef> = {
  pending:         { label: '대기중',    color: 'warning' },
  pending_payment: { label: '결제 대기', color: 'warning' },
  confirmed:       { label: '확정',      color: 'primary' },
  preparing:       { label: '준비중',    color: 'info' },
  ready:           { label: '조리완료',  color: 'info' },
  seated:          { label: '착석',      color: 'secondary' },
  completed:       { label: '완료',      color: 'success' },
  cancelled:       { label: '취소',      color: 'error' },
  no_show:         { label: '노쇼',      color: 'error' },
};

export const PAYMENT_STATUS: Record<string, StatusDef> = {
  pending:        { label: '대기',     color: 'warning' },
  paid:           { label: '결제완료', color: 'success' },
  refunded:       { label: '환불완료', color: 'error' },
  partial_refund: { label: '부분환불', color: 'info' },
};

export const SETTLEMENT_STATUS: Record<string, StatusDef> = {
  pending: { label: '지급 대기', color: 'warning' },
  paid:    { label: '지급 완료', color: 'success' },
};

export const USER_STATUS: Record<string, StatusDef> = {
  active:  { label: '활성',   color: 'success' },
  blocked: { label: '차단됨', color: 'error' },
  pending: { label: '대기',   color: 'warning' },
};

/** 상태 맵 안전 조회 (없으면 키 그대로 + default 색) */
export const resolveStatus = (map: Record<string, StatusDef>, key?: string): StatusDef =>
  (key && map[key]) || { label: key || '-', color: 'default' };

// ── MUI 테마 ──
const theme = createTheme({
  palette: {
    primary:   { main: brand[400], light: brand[200], dark: brand[600], contrastText: '#FFFFFF' },
    secondary: { main: brand[300], dark: brand[600], contrastText: '#4C422C' },
    success:   { main: '#2E7D32', light: '#E8F5E9', dark: '#1B5E20', contrastText: '#FFFFFF' },
    warning:   { main: '#ED6C02', light: '#FFF3E0', dark: '#B53D00', contrastText: '#FFFFFF' },
    error:     { main: '#D32F2F', light: '#FDECEA', dark: '#A31515', contrastText: '#FFFFFF' },
    info:      { main: '#0288D1', light: '#E8F1FB', dark: '#01579B', contrastText: '#FFFFFF' },
    background: { default: brand[50], paper: '#FFFFFF' },
    text: { primary: brand[900], secondary: brand[700], disabled: '#A89E90' },
    divider: brand[300],
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '"Pretendard", "Pretendard Variable", system-ui, -apple-system, "Apple SD Gothic Neo", sans-serif',
    h4: { fontWeight: 700, fontSize: '1.75rem', lineHeight: 1.3 },
    h5: { fontWeight: 700, fontSize: '1.375rem' },
    h6: { fontWeight: 600, fontSize: '1.125rem' },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600, fontSize: '0.8125rem' },
    body2: { fontSize: '0.875rem' },
    caption: { fontSize: '0.75rem' },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 8 } },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: `1px solid ${brand[200]}`,
          boxShadow: '0 1px 3px rgba(76,66,44,0.05)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: { rounded: { borderRadius: 12 } },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 600, backgroundColor: brand[50], color: brand[900] },
      },
    },
    MuiTableRow: {
      styleOverrides: { root: { '&:hover': { backgroundColor: brand[50] } } },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600 }, sizeSmall: { height: 22 } },
    },
    MuiTab: {
      styleOverrides: { root: { fontWeight: 600, textTransform: 'none' } },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 14 } },
    },
    MuiDialogTitle: {
      styleOverrides: { root: { fontWeight: 700 } },
    },
  },
});

export { brand };
export default theme;
