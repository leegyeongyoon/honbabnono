import { createTheme } from '@mui/material/styles';

// ============================================================
// 잇테이블 점주 대시보드 — 디자인 시스템 (단일 소스)
// 브랜드: 월·베이지 (#C4A08A 원색 유지)
// ============================================================

export type ChipColor =
  | 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

export interface StatusDef { label: string; color: ChipColor; }

// ── 도메인 상태색 중앙화 (각 컴포넌트의 로컬 맵을 대체) ──
export const RESERVATION_STATUS: Record<string, StatusDef> = {
  pending_payment: { label: '결제 대기', color: 'warning' },
  pending:         { label: '대기',      color: 'default' },
  confirmed:       { label: '확정',      color: 'info' },
  preparing:       { label: '준비중',    color: 'warning' },
  ready:           { label: '조리완료',  color: 'success' },
  seated:          { label: '착석',      color: 'secondary' },
  completed:       { label: '완료',      color: 'default' },
  cancelled:       { label: '취소',      color: 'error' },
};

// 도착 상태 — server/constants/arrivalStatus.js 표준값과 일치
export const ARRIVAL_STATUS: Record<string, StatusDef> = {
  on_the_way: { label: '가는 중',   color: 'warning' },
  nearby:     { label: '근처 도착', color: 'info' },
  arrived:    { label: '도착',      color: 'success' },
  noshow:     { label: '노쇼',      color: 'error' },
};

export const COOKING_STATUS: Record<string, StatusDef> = {
  pending:   { label: '대기중',   color: 'default' },
  preparing: { label: '준비중',   color: 'warning' },
  cooking:   { label: '조리중',   color: 'warning' },
  ready:     { label: '조리완료', color: 'success' },
  served:    { label: '서빙완료', color: 'default' },
  rejected:  { label: '거절',     color: 'error' },
};

export const SETTLEMENT_STATUS: Record<string, StatusDef> = {
  pending:  { label: '정산 대기', color: 'warning' },
  paid:     { label: '지급 완료', color: 'success' },
  rejected: { label: '반려',      color: 'error' },
};

/** 상태 맵에서 안전 조회 (없으면 키 그대로 + default 색) */
export const resolveStatus = (map: Record<string, StatusDef>, key?: string): StatusDef =>
  (key && map[key]) || { label: key || '-', color: 'default' };

// ── 조리 칸반 컬럼 (배경은 연하게 + accent로 의미화) ──
export interface KanbanColumnDef {
  status: 'pending' | 'preparing' | 'cooking' | 'ready';
  label: string;
  bg: string;
  accent: string;
}
export const KANBAN_COLUMNS: KanbanColumnDef[] = [
  { status: 'pending',   label: '대기중', bg: '#EEEAE6', accent: '#8F674B' },
  { status: 'preparing', label: '준비중', bg: '#FCEFD9', accent: '#C77700' },
  { status: 'cooking',   label: '조리중', bg: '#FFF6D6', accent: '#B7950B' },
  { status: 'ready',     label: '완료',   bg: '#DDF0E1', accent: '#2E7D4F' },
];

// ── MUI 테마 ──
const theme = createTheme({
  palette: {
    primary:   { main: '#C4A08A', light: '#FAF6F3', dark: '#A88068', contrastText: '#FFFFFF' },
    secondary: { main: '#8F674B', light: '#A88068', dark: '#6E4E38', contrastText: '#FFFFFF' },
    success:   { main: '#2E7D4F', light: '#E8F5E9', dark: '#1B5E37', contrastText: '#FFFFFF' },
    warning:   { main: '#C77700', light: '#FFF3E0', dark: '#8F5400', contrastText: '#FFFFFF' },
    error:     { main: '#C62828', light: '#FFEBEE', dark: '#8E1B1B', contrastText: '#FFFFFF' },
    info:      { main: '#2563A8', light: '#E8F1FB', dark: '#184B82', contrastText: '#FFFFFF' },
    background: { default: '#FAF6F3', paper: '#FFFFFF' },
    text: { primary: '#2E2A26', secondary: '#6B635C', disabled: '#A8A09A' },
    divider: 'rgba(17,17,17,0.08)',
    custom: {
      brand: '#C4A08A',
      brandSoft: '#FAF6F3',
      kanban: {
        pending:   { bg: '#EEEAE6', accent: '#8F674B' },
        preparing: { bg: '#FCEFD9', accent: '#C77700' },
        cooking:   { bg: '#FFF6D6', accent: '#B7950B' },
        ready:     { bg: '#DDF0E1', accent: '#2E7D4F' },
      },
    },
  },
  shape: { borderRadius: 10 },
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
          border: '1px solid rgba(17,17,17,0.08)',
          boxShadow: '0 1px 3px rgba(17,17,17,0.04)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: { rounded: { borderRadius: 12 } },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 600, backgroundColor: '#FAF6F3', color: '#2E2A26' },
      },
    },
    MuiTableRow: {
      styleOverrides: { root: { '&:hover': { backgroundColor: '#FAF6F3' } } },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600 }, sizeSmall: { height: 22 } },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 14 } },
    },
    MuiDialogTitle: {
      styleOverrides: { root: { fontWeight: 700 } },
    },
  },
});

export default theme;
