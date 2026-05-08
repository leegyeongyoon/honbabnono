import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
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

import Dashboard from './components/Dashboard';
import MerchantManagement from './components/MerchantManagement';
import RestaurantManagement from './components/RestaurantManagement';
import ReservationMonitoring from './components/ReservationMonitoring';
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

const theme = createTheme({
  palette: {
    primary: {
      main: '#C9B59C',
      light: '#F9F8F6',
      dark: '#A08B7A',
    },
    secondary: {
      main: '#D9CFC7',
    },
    background: {
      default: '#F9F8F6',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#4C422C',
      secondary: '#766653',
    },
  },
  typography: {
    h4: {
      fontWeight: 700,
      color: '#4C422C',
    },
    h6: {
      fontWeight: 600,
      color: '#4C422C',
    },
  },
});

const drawerWidth = 240;

const menuItems: Array<{ text: string; icon?: React.ReactNode; path?: string; divider?: boolean }> = [
  { text: '대시보드', icon: <DashboardIcon />, path: '/dashboard' },
  { text: '---', divider: true },
  { text: '점주 관리', icon: <StorefrontIcon />, path: '/merchants' },
  { text: '매장 관리', icon: <RestaurantIcon />, path: '/restaurants' },
  { text: '예약 모니터링', icon: <EventAvailableIcon />, path: '/reservations' },
  { text: '---', divider: true },
  { text: '사용자 관리', icon: <PeopleIcon />, path: '/users' },
  { text: '차단 관리', icon: <BlockIcon />, path: '/blocked-users' },
  { text: '---', divider: true },
  { text: '약속 관리 (레거시)', icon: <EventIcon />, path: '/meetups' },
  { text: '약속금/결제', icon: <PaymentIcon />, path: '/deposits' },
  { text: '---', divider: true },
  { text: '채팅 관리', icon: <ChatIcon />, path: '/chat' },
  { text: '리뷰 관리', icon: <RateReviewIcon />, path: '/reviews' },
  { text: '뱃지 관리', icon: <EmojiEventsIcon />, path: '/badges' },
  { text: '---', divider: true },
  { text: '알림 관리', icon: <NotificationsIcon />, path: '/notifications' },
  { text: '신고 관리', icon: <ReportIcon />, path: '/reports' },
  { text: '지원 티켓', icon: <SupportAgentIcon />, path: '/support' },
  { text: '---', divider: true },
  { text: '공지사항', icon: <AnnouncementIcon />, path: '/notices' },
  { text: '광고 관리', icon: <CampaignIcon />, path: '/advertisements' },
  { text: '---', divider: true },
  { text: '관리자 계정', icon: <AdminPanelSettingsIcon />, path: '/admin-accounts' },
  { text: '챗봇 설정', icon: <SmartToyIcon />, path: '/chatbot-settings' },
  { text: '리포트', icon: <ReportIcon />, path: '/reports-download' },
  { text: '설정', icon: <SettingsIcon />, path: '/settings' },
];

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
        <Box sx={{ display: 'flex' }}>
          <AppBar
            position="fixed"
            sx={{ 
              width: `calc(100% - ${drawerWidth}px)`, 
              ml: `${drawerWidth}px`,
              backgroundColor: '#C9B59C',
            }}
          >
            <Toolbar>
              <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                잇테이블 관리자 패널
              </Typography>
              <Typography variant="body2" sx={{ mr: 2 }}>
                {adminData?.username || '관리자'}님
              </Typography>
              <Button 
                color="inherit" 
                onClick={handleLogout}
                startIcon={<LogoutIcon />}
                sx={{ 
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  }
                }}
              >
                로그아웃
              </Button>
            </Toolbar>
          </AppBar>
          
          <Drawer
            sx={{
              width: drawerWidth,
              flexShrink: 0,
              '& .MuiDrawer-paper': {
                width: drawerWidth,
                boxSizing: 'border-box',
                backgroundColor: '#FFFFFF',
                borderRight: '1px solid #D9CFC7',
              },
            }}
            variant="permanent"
            anchor="left"
          >
            <Toolbar>
              <Typography variant="h6" sx={{ color: '#4C422C', fontWeight: 700 }}>
                잇테이블
              </Typography>
            </Toolbar>
            <List>
              {menuItems.map((item, index) => {
                if (item.divider) {
                  return <Divider key={index} sx={{ my: 0.5 }} />;
                }
                return (
                  <ListItem key={item.text} disablePadding>
                    <ListItemButton
                      component="a"
                      href={item.path}
                      sx={{
                        '&:hover': { backgroundColor: '#F9F8F6' },
                      }}
                    >
                      <ListItemIcon sx={{ color: '#C9B59C' }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.text}
                        sx={{ '& .MuiTypography-root': { color: '#4C422C', fontWeight: 500 } }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Drawer>
          
          <Box
            component="main"
            sx={{ 
              flexGrow: 1, 
              bgcolor: 'background.default', 
              p: 3,
              width: `calc(100% - ${drawerWidth}px)`,
            }}
          >
            <Toolbar />
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/merchants" element={<MerchantManagement />} />
              <Route path="/restaurants" element={<RestaurantManagement />} />
              <Route path="/reservations" element={<ReservationMonitoring />} />
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
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;