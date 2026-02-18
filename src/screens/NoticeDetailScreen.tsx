import React from 'react';
import { Text } from 'react-native';
import { COLORS } from '../styles/colors';
import UniversalNoticeDetailScreen from '../components/shared/UniversalNoticeDetailScreen';

interface NoticeDetailScreenProps {
  navigation: any;
  route: any;
  user?: any;
}

// Native HTML renderer component
const NativeRenderer: React.FC<{ content: string }> = ({ content }) => {
  // Simple HTML strip renderer for native
  // In a real app, you might use react-native-render-html
  const stripHtml = (html: string) => {
    return html.replace(/<[^>]*>/g, '');
  };

  return (
    <Text style={{ fontSize: 16, lineHeight: 24, color: COLORS.text.primary }}>
      {stripHtml(content)}
    </Text>
  );
};

const NoticeDetailScreen: React.FC<NoticeDetailScreenProps> = ({ 
  navigation, 
  route, 
  user 
}) => {
  // Extract notice ID from route params
  const noticeId = route?.params?.noticeId || route?.params?.id;

  const handleViewIncrement = (_noticeId: number) => {
  };

  return (
    <UniversalNoticeDetailScreen
      navigation={navigation}
      noticeId={noticeId}
      user={user}
      onViewIncrement={handleViewIncrement}
      NativeRenderer={NativeRenderer}
    />
  );
};

export default NoticeDetailScreen;