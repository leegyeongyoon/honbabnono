/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

// Mock react-navigation
jest.mock('@react-navigation/native', () => {
  return {
    NavigationContainer: ({children}: {children: React.ReactNode}) => children,
  };
});

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({children}: {children: React.ReactNode}) => children,
    Screen: ({children}: {children: React.ReactNode}) => children,
  }),
}));

jest.mock('../src/navigation/NavigationService', () => ({
  navigationRef: {
    isReady: () => true,
    navigate: jest.fn(),
    goBack: jest.fn(),
    getCurrentRoute: () => null,
  },
  navigate: jest.fn(),
  goBack: jest.fn(),
  getCurrentRoute: jest.fn(),
  getCurrentRouteName: jest.fn(),
}));

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
