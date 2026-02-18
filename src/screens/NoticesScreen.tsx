import React from 'react';
import UniversalNoticesScreen from '../components/shared/UniversalNoticesScreen';

interface NoticesScreenProps {
  navigation: any;
  user?: any;
}

interface Notice {
  id: number;
  title: string;
  content: string;
  type: 'general' | 'important' | 'maintenance' | 'event';
  created_at: string;
  updated_at: string;
  is_pinned: boolean;
}

const NoticesScreen: React.FC<NoticesScreenProps> = ({ navigation, user }) => {
  const handleNoticePress = (notice: Notice) => {
    // Handle notice press - navigate to detail screen
    navigation.navigate('NoticeDetail', { 
      noticeId: notice.id,
      notice: notice // Pass the full notice object for offline capability
    });
  };

  const handleNoticesLoad = (_notices: Notice[]) => {
    // Handle notices load for analytics or caching
  };

  return (
    <UniversalNoticesScreen
      navigation={navigation}
      user={user}
      onNoticePress={handleNoticePress}
      onNoticesLoad={handleNoticesLoad}
    />
  );
};

export default NoticesScreen;