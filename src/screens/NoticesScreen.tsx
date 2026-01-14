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

  const handleNoticesLoad = (notices: Notice[]) => {
    // Handle notices load for analytics or caching
    console.log('공지사항 로드됨:', notices.length, '개');
    
    // Could cache notices locally for offline viewing
    // Could send analytics events
    // Could update notification badges
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