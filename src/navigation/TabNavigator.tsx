import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Text} from 'react-native';
import {RootTabParamList} from '../types/navigation';
import {TAB_ROUTES} from './routes';
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
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#999',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#eee',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: '#eee',
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: 'bold',
          color: '#333',
        },
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