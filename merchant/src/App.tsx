import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
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
import EventIcon from '@mui/icons-material/Event';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import StoreIcon from '@mui/icons-material/Store';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
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
import MerchantSettings from './components/MerchantSettings';

const theme = createTheme({
  palette: {
    primary: {
      main: '#C4A08A',
      light: '#FAF6F3',
      dark: '#A88068',
    },
    secondary: {
      main: '#A88068',
    },
    background: {
      default: '#FAF6F3',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#333333',
      secondary: '#666666',
    },
  },
  typography: {
    h4: {
      fontWeight: 700,
      color: '#333333',
    },
    h6: {
      fontWeight: 600,
      color: '#333333',
    },
  },
});

const drawerWidth = 240;

const menuItems: Array<{ text: string; icon: React.ReactNode; path: string }> = [
  { text: '대시보드', icon: <DashboardIcon />, path: '/' },
  { text: '예약 관리', icon: <EventIcon />, path: '/reservations' },
  { text: '주문 관리', icon: <RestaurantMenuIcon />, path: '/orders' },
  { text: '메뉴 관리', icon: <MenuBookIcon />, path: '/menus' },
  { text: '매장 정보', icon: <StoreIcon />, path: '/store' },
  { text: '정산', icon: <AccountBalanceIcon />, path: '/settlements' },
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

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: `calc(100% - ${drawerWidth}px)`,
          ml: `${drawerWidth}px`,
          backgroundColor: '#C4A08A',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, color: '#FFFFFF' }}>
            잇테이블 점주 대시보드
          </Typography>
          <Typography variant="body2" sx={{ mr: 2, color: '#FFFFFF' }}>
            {merchantData?.business_name || merchantData?.username || '점주'}님
          </Typography>
          <Button
            color="inherit"
            onClick={onLogout}
            startIcon={<LogoutIcon />}
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
              },
            }}
          >
            로그아웃
          </Button>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            borderRight: '1px solid rgba(0,0,0,0.06)',
          },
        }}
      >
        <Toolbar sx={{ justifyContent: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#C4A08A' }}>
            잇테이블
          </Typography>
        </Toolbar>
        <Divider />
        <List>
          {menuItems.map((item) => (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => navigate(item.path)}
                sx={{
                  '&.Mui-selected': {
                    backgroundColor: '#FAF6F3',
                    borderRight: '3px solid #C4A08A',
                    '&:hover': {
                      backgroundColor: '#FAF6F3',
                    },
                  },
                  '&:hover': {
                    backgroundColor: '#FAF6F3',
                  },
                }}
              >
                <ListItemIcon sx={{ color: location.pathname === item.path ? '#C4A08A' : '#999' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontWeight: location.pathname === item.path ? 600 : 400,
                    color: location.pathname === item.path ? '#C4A08A' : '#333',
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          p: 3,
          mt: '64px',
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/reservations" element={<ReservationBoard />} />
          <Route path="/orders" element={<OrderManagement />} />
          <Route path="/menus" element={<MenuManagement />} />
          <Route path="/store" element={<StoreInfo />} />
          <Route path="/settlements" element={<SettlementHistory />} />
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
