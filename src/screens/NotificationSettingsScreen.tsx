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
  const handleSettingsChange = (_settings: NotificationSettings) => {
    // Handle settings change for analytics or other native-specific logic
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