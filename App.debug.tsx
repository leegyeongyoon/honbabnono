/**
 * Debug Version - 알림 테스트용 네이티브 화면
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  Platform,
  StatusBar,
  Text,
  TouchableOpacity,
} from 'react-native';
import { WebView } from 'react-native-webview';
import NotificationTestScreen from './src/screens/NotificationTestScreen';

const WEBVIEW_URL = __DEV__ 
  ? 'http://localhost:3000' 
  : 'https://honbabnono.com';

type ScreenType = 'webview' | 'notification-test';

function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('webview');

  const renderTopNavigation = () => (
    <View style={styles.topNav}>
      <TouchableOpacity 
        style={[styles.navButton, currentScreen === 'webview' && styles.activeNavButton]}
        onPress={() => setCurrentScreen('webview')}
      >
        <Text style={[styles.navButtonText, currentScreen === 'webview' && styles.activeNavButtonText]}>
          웹앱
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.navButton, currentScreen === 'notification-test' && styles.activeNavButton]}
        onPress={() => setCurrentScreen('notification-test')}
      >
        <Text style={[styles.navButtonText, currentScreen === 'notification-test' && styles.activeNavButtonText]}>
          알림 테스트
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => {
    switch (currentScreen) {
      case 'notification-test':
        return <NotificationTestScreen />;
      case 'webview':
      default:
        return (
          <WebView
            source={{ uri: WEBVIEW_URL }}
            style={styles.webview}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            scalesPageToFit={false}
            bounces={false}
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9F8F6" />
      
      {__DEV__ && renderTopNavigation()}
      
      <View style={styles.content}>
        {renderContent()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F8F6',
  },
  topNav: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  navButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  activeNavButton: {
    backgroundColor: '#C9B59C',
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeNavButtonText: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});

export default App;