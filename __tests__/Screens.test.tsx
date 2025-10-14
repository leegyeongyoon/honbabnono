import React from 'react';
import {render} from '@testing-library/react-native';
import HomeScreen from '../src/screens/HomeScreen';
import SearchScreen from '../src/screens/SearchScreen';
import ChatScreen from '../src/screens/ChatScreen';
import MyPageScreen from '../src/screens/MyPageScreen';

// Mock navigation hooks
jest.mock('../src/hooks/useNavigation', () => ({
  useTypedNavigation: () => ({
    navigate: jest.fn(),
    navigateToHome: jest.fn(),
    navigateToSearch: jest.fn(),
    navigateToChat: jest.fn(),
    navigateToMyPage: jest.fn(),
  }),
}));

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({
    params: {},
  }),
}));

describe('Screen Components Integration Tests', () => {
  describe('HomeScreen', () => {
    test('renders home screen with key elements', () => {
      const component = render(<HomeScreen />);
      
      expect(component.getByText('안녕하세요! 👋')).toBeTruthy();
      expect(component.getByText('🔥 인기 모임')).toBeTruthy();
      expect(component.getByText('강남역 파스타 맛집 탐방')).toBeTruthy();
      expect(component.getByText('홍대 술집 호핑')).toBeTruthy();
    });
  });

  describe('SearchScreen', () => {
    test('renders search screen with categories', () => {
      const component = render(<SearchScreen />);
      
      expect(component.getByPlaceholderText('지역, 음식 종류로 검색해보세요')).toBeTruthy();
      expect(component.getByText('🍽️ 음식 카테고리')).toBeTruthy();
      expect(component.getByText('한식')).toBeTruthy();
      expect(component.getByText('중식')).toBeTruthy();
      expect(component.getByText('일식')).toBeTruthy();
    });
  });

  describe('ChatScreen', () => {
    test('renders chat screen with chat list', () => {
      const component = render(<ChatScreen />);
      
      expect(component.getByText('채팅')).toBeTruthy();
      expect(component.getByText('진행 중인 모임 3개')).toBeTruthy();
      expect(component.getByText('강남역 파스타 맛집 탐방')).toBeTruthy();
    });
  });

  describe('MyPageScreen', () => {
    test('renders my page with profile info', () => {
      const component = render(<MyPageScreen />);
      
      expect(component.getByText('김혼밥')).toBeTruthy();
      expect(component.getByText('🌟 믿음직한 밥친구')).toBeTruthy();
      expect(component.getByText('🏆 내 뱃지')).toBeTruthy();
      expect(component.getByText('내 모임 관리')).toBeTruthy();
    });
  });
});