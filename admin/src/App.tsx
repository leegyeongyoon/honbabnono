import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListSubheader from '@mui/material/ListSubheader';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import MenuIcon from '@mui/icons-material/Menu';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import HistoryIcon from '@mui/icons-material/History';
import theme from './theme';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import EventIcon from '@mui/icons-material/Event';
import ReportIcon from '@mui/icons-material/Report';
import SettingsIcon from '@mui/icons-material/Settings';
import BlockIcon from '@mui/icons-material/Block';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CampaignIcon from '@mui/icons-material/Campaign';
import AnnouncementIcon from '@mui/icons-material/Announcement';
import PaymentIcon from '@mui/icons-material/Payment';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import ChatIcon from '@mui/icons-material/Chat';
import RateReviewIcon from '@mui/icons-material/RateReview';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import StorefrontIcon from '@mui/icons-material/Storefront';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CreditCardIcon from '@mui/icons-material/CreditCard';

import Dashboard from './components/Dashboard';
import MerchantManagement from './components/MerchantManagement';
import RestaurantManagement from './components/RestaurantManagement';
import ReservationMonitoring from './components/ReservationMonitoring';
import SettlementManagement from './components/SettlementManagement';
import PaymentManagement from './components/PaymentManagement';
import UserManagement from './components/UserManagement';
import MeetupManagement from './components/MeetupManagement';
import Reports from './components/Reports';
import Settings from './components/Settings';
import BlockedUserManagement from './components/BlockedUserManagement';
import AdminManagement from './components/AdminManagement';
import AdvertisementManagement from './components/AdvertisementManagement';
import ChatbotSettings from './components/ChatbotSettings';
import NoticeManagement from './components/NoticeManagement';
import DepositManagement from './components/DepositManagement';
import BadgeManagement from './components/BadgeManagement';
import NotificationManagement from './components/NotificationManagement';
import SupportManagement from './components/SupportManagement';
import ChatManagement from './components/ChatManagement';
import ReviewManagement from './components/ReviewManagement';
import Login from './components/Login';

const drawerWidth = 240;

interface NavItem { text: string; icon: React.ReactNode; path: string; }
interface NavGroup { label: string; items: NavItem[]; collapsible?: boolean; defaultOpen?: boolean; }

const NAV_GROUPS: NavGroup[] = [
  { label: '', items: [
    { text: '대시보드', icon: <DashboardIcon />, path: '/dashboard' },
  ] },
  { label: '운영', items: [
    { text: '점주 관리', icon: <StorefrontIcon />, path: '/merchants' },
    { text: '매장 관리', icon: <RestaurantIcon />, path: '/restaurants' },
    { text: '예약 모니터링', icon: <EventAvailableIcon />, path: '/reservations' },
    { text: '정산 관리', icon: <AccountBalanceIcon />, path: '/settlements' },
    { text: '결제 관리', icon: <CreditCardIcon />, path: '/payments' },
  ] },
  { label: '사용자', items: [
    { text: '사용자 관리', icon: <PeopleIcon />, path: '/users' },
    { text: '차단 관리', icon: <BlockIcon />, path: '/blocked-users' },
    { text: '리뷰 관리', icon: <RateReviewIcon />, path: '/reviews' },
    { text: '신고 관리', icon: <ReportIcon />, path: '/reports' },
    { text: '지원 티켓', icon: <SupportAgentIcon />, path: '/support' },
  ] },
  { label: '콘텐츠', items: [
    { text: '공지사항', icon: <AnnouncementIcon />, path: '/notices' },
    { text: '광고 관리', icon: <CampaignIcon />, path: '/advertisements' },
    { text: '알림 관리', icon: <NotificationsIcon />, path: '/notifications' },
    { text: '채팅 관리', icon: <ChatIcon />, path: '/chat' },
  ] },
  { label: '시스템', items: [
    { text: '관리자 계정', icon: <AdminPanelSettingsIcon />, path: '/admin-accounts' },
    { text: '챗봇 설정', icon: <SmartToyIcon />, path: '/chatbot-settings' },
    { text: '리포트', icon: <ReportIcon />, path: '/reports-download' },
    { text: '설정', icon: <SettingsIcon />, path: '/settings' },
  ] },
  { label: '레거시 (v1)', collapsible: true, defaultOpen: false, items: [
    { text: '약속 관리', icon: <EventIcon />, path: '/meetups' },
    { text: '약속금/결제', icon: <PaymentIcon />, path: '/deposits' },
    { text: '뱃지 관리', icon: <EmojiEventsIcon />, path: '/badges' },
  ] },
];

/** 사이드바 + 상단바 셸 — Router 내부에서 useNavigate/useLocation 사용 (SPA 네비) */
function AdminShell({
  adminData, onLogout, children,
}: { adminData: any; onLogout: () => void; children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [legacyOpen, setLegacyOpen] = useState(false);

  const go = (path: string) => { navigate(path); if (!isDesktop) setMobileOpen(false); };

  const renderItem = (item: NavItem) => {
    const active = location.pathname === item.path;
    return (
      <ListItem key={item.path} disablePadding sx={{ mb: 0.25 }}>
        <ListItemButton
          selected={active}
          onClick={() => go(item.path)}
          sx={{
            borderRadius: 2, mx: 1,
            '&.Mui-selected': {
              backgroundColor: 'primary.light',
              '&:hover': { backgroundColor: 'primary.light' },
            },
            '&:hover': { backgroundColor: 'action.hover' },
          }}
        >
          <ListItemIcon sx={{ minWidth: 38, color: active ? 'primary.dark' : 'text.disabled' }}>
            {item.icon}
          </ListItemIcon>
          <ListItemText
            primary={item.text}
            primaryTypographyProps={{
              fontWeight: active ? 700 : 500,
              color: active ? 'primary.dark' : 'text.primary',
              fontSize: '0.875rem',
            }}
          />
        </ListItemButton>
      </ListItem>
    );
  };

  const drawerContent = (
    <>
      <Toolbar>
        <Typography variant="h6" sx={{ color: 'primary.dark', fontWeight: 800, letterSpacing: '-0.02em' }}>
          잇테이블
          <Typography component="span" variant="caption" sx={{ ml: 0.75, color: 'text.disabled', fontWeight: 600 }}>
            관리자
          </Typography>
        </Typography>
      </Toolbar>
      <Box sx={{ overflowY: 'auto', flexGrow: 1, py: 1 }}>
        {NAV_GROUPS.map((group) => {
          if (group.collapsible) {
            return (
              <List key={group.label} dense>
                <ListItemButton onClick={() => setLegacyOpen((o) => !o)} sx={{ mx: 1, borderRadius: 2 }}>
                  <ListItemIcon sx={{ minWidth: 38, color: 'text.disabled' }}><HistoryIcon /></ListItemIcon>
                  <ListItemText primary={group.label}
                    primaryTypographyProps={{ fontSize: '0.8125rem', fontWeight: 600, color: 'text.secondary' }} />
                  {legacyOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                </ListItemButton>
                <Collapse in={legacyOpen} timeout="auto" unmountOnExit>
                  <List disablePadding>{group.items.map(renderItem)}</List>
                </Collapse>
              </List>
            );
          }
          return (
            <List
              key={group.label || 'home'}
              dense
              subheader={group.label ? (
                <ListSubheader disableSticky sx={{ bgcolor: 'transparent', color: 'text.disabled', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.04em', lineHeight: 2.4 }}>
                  {group.label}
                </ListSubheader>
              ) : undefined}
            >
              {group.items.map(renderItem)}
            </List>
          );
        })}
      </Box>
    </>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          backgroundColor: 'primary.main',
          borderBottom: '1px solid rgba(76,66,44,0.08)',
        }}
      >
        <Toolbar>
          {!isDesktop && (
            <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
            관리자 패널
          </Typography>
          <Typography variant="body2" sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }}>
            {adminData?.username || '관리자'}님
          </Typography>
          <Button color="inherit" onClick={onLogout} startIcon={<LogoutIcon />}
            sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.15)' } }}>
            로그아웃
          </Button>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant={isDesktop ? 'permanent' : 'temporary'}
          open={isDesktop ? true : mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: drawerWidth, boxSizing: 'border-box',
              backgroundColor: '#FFFFFF', borderRight: '1px solid', borderColor: 'divider',
              display: 'flex', flexDirection: 'column',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      <Box
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          p: { xs: 2, md: 3 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminData, setAdminData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = () => {
    const token = localStorage.getItem('adminToken');
    const storedAdminData = localStorage.getItem('adminData');

    if (token && storedAdminData) {
      try {
        const adminInfo = JSON.parse(storedAdminData);
        setAdminData(adminInfo);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('토큰 파싱 오류:', error);
        handleLogout();
      }
    }
    setLoading(false);
  };

  const handleLoginSuccess = (token: string, adminInfo: any) => {
    setIsAuthenticated(true);
    setAdminData(adminInfo);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    setIsAuthenticated(false);
    setAdminData(null);
  };

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            backgroundColor: '#F9F8F6',
          }}
        >
          <Typography>로딩 중...</Typography>
        </Box>
      </ThemeProvider>
    );
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AdminShell adminData={adminData} onLogout={handleLogout}>
          <Box component="main" sx={{ flexGrow: 1 }}>
            <Toolbar />
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/merchants" element={<MerchantManagement />} />
              <Route path="/restaurants" element={<RestaurantManagement />} />
              <Route path="/reservations" element={<ReservationMonitoring />} />
              <Route path="/settlements" element={<SettlementManagement />} />
              <Route path="/payments" element={<PaymentManagement />} />
              <Route path="/users" element={<UserManagement />} />
              <Route path="/blocked-users" element={<BlockedUserManagement />} />
              <Route path="/meetups" element={<MeetupManagement />} />
              <Route path="/deposits" element={<DepositManagement />} />
              <Route path="/chat" element={<ChatManagement />} />
              <Route path="/reviews" element={<ReviewManagement />} />
              <Route path="/badges" element={<BadgeManagement />} />
              <Route path="/notifications" element={<NotificationManagement />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/support" element={<SupportManagement />} />
              <Route path="/notices" element={<NoticeManagement />} />
              <Route path="/advertisements" element={<AdvertisementManagement />} />
              <Route path="/admin-accounts" element={<AdminManagement />} />
              <Route path="/chatbot-settings" element={<ChatbotSettings />} />
              <Route path="/reports-download" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Box>
        </AdminShell>
      </Router>
    </ThemeProvider>
  );
}

export default App;