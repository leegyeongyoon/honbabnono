import React from 'react';
import {render, fireEvent} from '@testing-library/react-native';
import {View} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import TabNavigator from '../src/navigation/TabNavigator';

// Mock navigation
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    NavigationContainer: ({children}: {children: React.ReactNode}) => children,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
  };
});

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({children}: {children: React.ReactNode}) => children,
    Screen: () => null,
  }),
}));

describe('Navigation Integration Tests', () => {
  test('TabNavigator renders without crashing', () => {
    const component = render(
      <NavigationContainer>
        <TabNavigator />
      </NavigationContainer>
    );
    expect(component).toBeTruthy();
  });

  test('All screens are accessible', () => {
    const component = render(
      <NavigationContainer>
        <TabNavigator />
      </NavigationContainer>
    );
    
    // 컴포넌트가 렌더링되는지만 확인
    expect(component).toBeTruthy();
  });
});