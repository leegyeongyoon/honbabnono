import React from 'react';
import { useUserStore } from '../store/userStore';
import UniversalNotificationScreen from '../components/shared/UniversalNotificationScreen';

interface NotificationScreenProps {
  navigation?: any;
}

const NotificationScreen: React.FC<NotificationScreenProps> = ({ navigation }) => {
  const { user } = useUserStore();

  return (
    <UniversalNotificationScreen
      navigation={navigation}
      user={user}
    />
  );
};

export default NotificationScreen;