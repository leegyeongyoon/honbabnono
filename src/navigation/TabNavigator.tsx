import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Text} from 'react-native';
import {RootTabParamList} from '../types/navigation';
import {TAB_ROUTES} from './routes';
import {COLORS, SHADOWS} from '../styles/colors';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import ChatScreen from '../screens/ChatScreen';
import MyPageScreen from '../screens/MyPageScreen';

const Tab = createBottomTabNavigator<RootTabParamList>();

const getScreenComponent = (routeName: string) => {
  switch (routeName) {
    case 'Home':
      return HomeScreen;
    case 'Search':
      return SearchScreen;
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
        tabBarActiveTintColor: '#2d3748',
        tabBarInactiveTintColor: '#2d3748',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          height: 65,
          paddingBottom: 10,
          paddingTop: 10,
          ...SHADOWS.medium,
        },
        headerStyle: {
          backgroundColor: '#667eea',
          borderBottomWidth: 0,
          ...SHADOWS.small,
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: 'bold',
          color: '#ffffff',
        },
        headerTintColor: '#ffffff',
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

const TabIcon: React.FC<TabIconProps> = ({icon}) => {
  return (
    <Text style={{fontSize: 24}}>
      {icon}
    </Text>
  );
};

export default TabNavigator;