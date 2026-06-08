import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {RootTabParamList} from '../types/navigation';
import {TAB_ROUTES} from './routes';
import {COLORS, SHADOWS} from '../styles/colors';
import {TYPOGRAPHY} from '../styles/typography';
import {SPACING} from '../styles/spacing';
import {SimpleIcon, IconName} from '../components/SimpleIcon';
import RestaurantHomeScreen from '../screens/RestaurantHomeScreen';
import SearchRestaurantsScreen from '../screens/SearchRestaurantsScreen';
import MyReservationsScreen from '../screens/MyReservationsScreen';
import MyPageScreen from '../screens/MyPageScreen';

const Tab = createBottomTabNavigator<RootTabParamList>();

// v2 외식예약 탭: 홈(매장) / 검색 / 내 예약 / 마이
const getScreenComponent = (routeName: string) => {
  switch (routeName) {
    case 'RestaurantHome':
      return RestaurantHomeScreen;
    case 'SearchRestaurants':
      return SearchRestaurantsScreen;
    case 'MyReservations':
      return MyReservationsScreen;
    case 'MyPage':
      return MyPageScreen;
    default:
      return RestaurantHomeScreen;
  }
};

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary.main,
        tabBarInactiveTintColor: COLORS.neutral.grey400,
        tabBarLabelStyle: {
          fontSize: TYPOGRAPHY.tab.fontSize,
          fontWeight: '700' as const,
        },
        tabBarStyle: {
          backgroundColor: COLORS.neutral.white,
          borderTopWidth: 1,
          borderTopColor: 'rgba(224,146,110,0.06)',
          height: SPACING.bottomNav.height,
          paddingBottom: 6,
          paddingTop: SPACING.tab.paddingVertical,
          ...SHADOWS.sticky,
        },
        headerStyle: {
          backgroundColor: COLORS.primary.light,
          ...SHADOWS.sticky,
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '700',
          color: COLORS.text.primary,
          letterSpacing: -0.3,
        },
        headerTintColor: COLORS.text.primary,
      }}>
      {TAB_ROUTES.map((route) => (
        <Tab.Screen
          key={route.name}
          name={route.name}
          component={getScreenComponent(route.name)}
          options={{
            title: route.title,
            tabBarIcon: ({color}) => (
              <TabIcon icon={route.icon} color={color} />
            ),
            headerTitle: route.headerTitle,
            // 모든 v2 탭 화면은 자체 헤더 사용
            headerShown: false,
          }}
        />
      ))}
    </Tab.Navigator>
  );
};

interface TabIconProps {
  icon: string;
  color: string;
}

const TabIcon: React.FC<TabIconProps> = ({icon, color}) => {
  const getIconName = (tabIcon: string): IconName => {
    switch (tabIcon) {
      case '🏠':
        return 'home';
      case '🔍':
        return 'search';
      case '📋':
        return 'calendar';
      case '👤':
        return 'user';
      default:
        return 'home';
    }
  };

  return (
    <SimpleIcon 
      name={getIconName(icon)} 
      size={24} 
      color={color} 
    />
  );
};

export default TabNavigator;