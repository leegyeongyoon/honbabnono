import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {RootTabParamList} from '../types/navigation';
import {TAB_ROUTES} from './routes';
import {COLORS} from '../styles/colors';
import {TYPOGRAPHY} from '../styles/typography';
import {SPACING} from '../styles/spacing';
import {SimpleIcon} from '../components/SimpleIcon';
import HomeScreen from '../screens/HomeScreen';
import ExploreScreen from '../screens/ExploreScreen';
import ChatScreen from '../screens/ChatScreen';
import MyPageScreen from '../screens/MyPageScreen';

const Tab = createBottomTabNavigator<RootTabParamList>();

const getScreenComponent = (routeName: string) => {
  switch (routeName) {
    case 'Home':
      return HomeScreen;
    case 'Search':
      return ExploreScreen; // 탐색 탭에 지도/리스트 뷰 사용
    case 'Chat':
      return ChatScreen;
    case 'MyPage':
      return MyPageScreen;
    default:
      return HomeScreen;
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
          fontWeight: TYPOGRAPHY.tab.fontWeight,
        },
        tabBarStyle: {
          backgroundColor: COLORS.neutral.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.primary.accent,
          height: SPACING.bottomNav.height,
          paddingBottom: 6,
          paddingTop: SPACING.tab.paddingVertical,
        },
        headerStyle: {
          backgroundColor: COLORS.primary.light,
          ...SHADOWS.medium,
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '600',
          color: COLORS.text.primary,
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
            // Home, Search, MyPage는 자체 헤더 사용
            headerShown: route.name === 'Chat',
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
  const getIconName = (tabIcon: string): string => {
    switch (tabIcon) {
      case '🏠':
        return 'home';
      case '🔍':
        return 'compass'; // 탐색 아이콘 (지도 뷰에 더 적합)
      case '💬':
        return 'message-circle';
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