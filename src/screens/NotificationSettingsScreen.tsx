import React from 'react';
import UniversalNotificationSettingsScreen from '../components/shared/UniversalNotificationSettingsScreen';

interface NotificationSettingsScreenProps {
  navigation: any;
  user?: any;
}

interface NotificationSettings {
  pushNotifications: boolean;
  emailNotifications: boolean;
  meetupReminders: boolean;
  chatMessages: boolean;
  marketingEmails: boolean;
  weeklyDigest: boolean;
}

const NotificationSettingsScreen: React.FC<NotificationSettingsScreenProps> = ({ 
  navigation, 
  user 
}) => {
  const handleSettingsChange = (settings: NotificationSettings) => {
    // Handle settings change for analytics or other native-specific logic
    console.log('알림 설정이 변경되었습니다:', settings);
    
    // Could trigger native notifications permission requests here if needed
    // Could update local storage or send analytics events
  };

  return (
    <UniversalNotificationSettingsScreen
      navigation={navigation}
      user={user}
      onSettingsChange={handleSettingsChange}
    />
  );
};

export default NotificationSettingsScreen;