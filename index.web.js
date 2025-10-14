import React from 'react';
import {createRoot} from 'react-dom/client';
import {AppRegistry} from 'react-native-web';
import WebApp from './WebApp';

AppRegistry.registerComponent('HonbabnonoApp', () => WebApp);

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<WebApp />);