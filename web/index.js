import React from 'react';
import {createRoot} from 'react-dom/client';
import {AppRegistry} from 'react-native-web';
import App from '../App';

// React Native Web 설정
AppRegistry.registerComponent('HonbabnonoApp', () => App);

// 웹에서 앱 실행
const container = document.getElementById('root');
const root = createRoot(container);

const WebApp = () => {
  return <App />;
};

root.render(<WebApp />);