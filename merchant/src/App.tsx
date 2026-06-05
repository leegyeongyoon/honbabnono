import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
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
import theme from './theme';
import DashboardIcon from '@mui/icons-material/Dashboard';
import EventIcon from '@mui/icons-material/Event';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import StoreIcon from '@mui/icons-material/Store';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import RateReviewIcon from '@mui/icons-material/RateReview';
import ChatIcon from '@mui/icons-material/Chat';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';

import Login from './components/Login';
import Signup from './components/Signup';
import MerchantRegister from './components/MerchantRegister';
import StoreRegister from './components/StoreRegister';
import Dashboard from './components/Dashboard';
import ReservationBoard from './components/ReservationBoard';
import OrderManagement from './components/OrderManagement';
import MenuManagement from './components/MenuManagement';
import StoreInfo from './components/StoreInfo';
import SettlementHistory from './components/SettlementHistory';
import ReviewManagement from './components/ReviewManagement';
import ChatInbox from './components/ChatInbox';
import MerchantSettings from './components/MerchantSettings';

const drawerWidth = 240;

const menuItems: Array<{ text: string; icon: React.ReactNode; path: string }> = [
  { text: '대시보드', icon: <DashboardIcon />, path: '/' },
  { text: '예약 관리', icon: <EventIcon />, path: '/reservations' },
  { text: '주문 관리', icon: <RestaurantMenuIcon />, path: '/orders' },
  { text: '메뉴 관리', icon: <MenuBookIcon />, path: '/menus' },
  { text: '매장 정보', icon: <StoreIcon />, path: '/store' },
  { text: '정산', icon: <AccountBalanceIcon />, path: '/settlements' },
  { text: '리뷰 관리', icon: <RateReviewIcon />, path: '/reviews' },
  { text: '문의', icon: <ChatIcon />, path: '/chat' },
  { text: '설정', icon: <SettingsIcon />, path: '/settings' },
];

function PlaceholderPage({ title }: { title: string }) {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        {title}
      </Typography>
      <Typography color="text.secondary">
        준비 중인 페이지입니다.
      </Typography>
    </Box>
  );
}

function AppContent({ merchantData, onLogout }: { merchantData: any; onLogout: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const drawerContent = (
    <>
      <Toolbar sx={{ justifyContent: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: 'custom.brand', letterSpacing: '-0.02em' }}>
          잇테이블
          <Typography component="span" variant="caption" sx={{ ml: 0.75, color: 'text.disabled', fontWeight: 600 }}>
            점주
          </Typography>
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ px: 1, py: 1 }}>
        {menuItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={active}
                onClick={() => { navigate(item.path); if (!isDesktop) setMobileOpen(false); }}
                sx={{
                  borderRadius: 2,
                  '&.Mui-selected': {
                    backgroundColor: 'custom.brandSoft',
                    '&:hover': { backgroundColor: 'custom.brandSoft' },
                  },
                  '&:hover': { backgroundColor: 'action.hover' },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: active ? 'custom.brand' : 'text.disabled' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontWeight: active ? 700 : 500,
                    color: active ? 'primary.dark' : 'text.primary',
                    fontSize: '0.9rem',
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
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
          backgroundColor: 'custom.brand',
          borderBottom: '1px solid rgba(17,17,17,0.06)',
        }}
      >
        <Toolbar>
          {!isDesktop && (
            <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, color: '#FFFFFF', fontWeight: 700 }}>
            점주 대시보드
          </Typography>
          <Typography variant="body2" sx={{ mr: 2, color: 'rgba(255,255,255,0.92)', display: { xs: 'none', sm: 'block' } }}>
            {merchantData?.business_name || merchantData?.username || '점주'}님
          </Typography>
          <Button
            color="inherit"
            onClick={onLogout}
            startIcon={<LogoutIcon />}
            sx={{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.15)' } }}
          >
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
              width: drawerWidth,
              boxSizing: 'border-box',
              borderRight: '1px solid rgba(17,17,17,0.06)',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          p: { xs: 2, md: 3 },
          mt: '64px',
          minHeight: 'calc(100vh - 64px)',
          width: { md: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/reservations" element={<ReservationBoard />} />
          <Route path="/orders" element={<OrderManagement />} />
          <Route path="/menus" element={<MenuManagement />} />
          <Route path="/store" element={<StoreInfo />} />
          <Route path="/settlements" element={<SettlementHistory />} />
          <Route path="/reviews" element={<ReviewManagement />} />
          <Route path="/chat" element={<ChatInbox />} />
          <Route path="/settings" element={<MerchantSettings />} />
        </Routes>
      </Box>
    </Box>
  );
}

type AppView = 'login' | 'signup' | 'register' | 'store-register' | 'dashboard';

function App() {
  const [view, setView] = useState<AppView>('login');
  const [merchantData, setMerchantData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pendingToken, setPendingToken] = useState('');
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = () => {
    const token = localStorage.getItem('merchantToken');
    const storedData = localStorage.getItem('merchantData');

    if (token && storedData) {
      try {
        const info = JSON.parse(storedData);
        setMerchantData(info);
        setView('dashboard');
      } catch (error) {
        handleLogout();
      }
    }
    setLoading(false);
  };

  const handleLoginSuccess = (token: string, data: any) => {
    setMerchantData(data);
    // If merchant has no restaurant yet, show store registration
    if (!data.restaurant_id && !data.restaurantId) {
      setView('store-register');
    } else {
      setView('dashboard');
    }
  };

  const handleNeedRegister = (token: string, status?: string) => {
    setPendingToken(token);
    setPendingStatus(status || null);
    setView('register');
  };

  const handleLogout = () => {
    localStorage.removeItem('merchantToken');
    localStorage.removeItem('merchantData');
    setView('login');
    setMerchantData(null);
    setPendingToken('');
    setPendingStatus(null);
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
            backgroundColor: '#FAF6F3',
          }}
        >
          <Typography color="text.secondary">로딩 중...</Typography>
        </Box>
      </ThemeProvider>
    );
  }

  if (view === 'signup') {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Signup
          onGoLogin={() => setView('login')}
          onSignupComplete={() => setView('login')}
        />
      </ThemeProvider>
    );
  }

  if (view === 'register') {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <MerchantRegister
          token={pendingToken}
          existingStatus={pendingStatus}
          onBack={() => { handleLogout(); }}
        />
      </ThemeProvider>
    );
  }

  if (view === 'store-register') {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ backgroundColor: '#FAF6F3', minHeight: '100vh', px: 2 }}>
          <StoreRegister onComplete={() => {
            // Reload merchant data and go to dashboard
            window.location.reload();
          }} />
        </Box>
      </ThemeProvider>
    );
  }

  if (view === 'login') {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Login onLoginSuccess={handleLoginSuccess} onNeedRegister={handleNeedRegister} onGoSignup={() => setView('signup')} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AppContent merchantData={merchantData} onLogout={handleLogout} />
      </Router>
    </ThemeProvider>
  );
}

export default App;
