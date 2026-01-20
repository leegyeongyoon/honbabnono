import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {RootTabParamList} from '../types/navigation';
import {TAB_ROUTES} from './routes';
import {COLORS, SHADOWS} from '../styles/colors';
import {SimpleIcon} from '../components/SimpleIcon';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
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
        tabBarActiveTintColor: COLORS.primary.dark,
        tabBarInactiveTintColor: COLORS.text.tertiary,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        tabBarStyle: {
          backgroundColor: COLORS.neutral.white,
          borderTopWidth: 0,
          height: 65,
          paddingBottom: 10,
          paddingTop: 10,
          ...SHADOWS.medium,
        },
        headerStyle: {
          backgroundColor: COLORS.primary.main,
          borderBottomWidth: 0,
          ...SHADOWS.small,
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: 'bold',
          color: COLORS.text.white,
        },
        headerTintColor: COLORS.text.white,
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
            // 탐색 탭은 자체 헤더 사용
            headerShown: route.name !== 'Search',
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