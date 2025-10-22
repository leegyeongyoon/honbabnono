import React from 'react';
import {StatusBar, useColorScheme} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import RouterApp from './src/components/RouterApp';

function WebApp() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="#fff"
      />
      <RouterApp />
    </SafeAreaProvider>
  );
}

export default WebApp;