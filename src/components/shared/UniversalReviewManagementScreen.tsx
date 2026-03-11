import React from 'react';
import UniversalMyReviewsScreen from './UniversalMyReviewsScreen';

interface NavigationAdapter {
  navigate: (screen: string, params?: any) => void;
  goBack: () => void;
}

// ReviewManagement now delegates to UniversalMyReviewsScreen which has both
// "written" and "received" tabs with full edit/delete/reply functionality.
const UniversalReviewManagementScreen: React.FC<{navigation: NavigationAdapter; user?: any}> = ({
  navigation,
  user,
}) => {
  return <UniversalMyReviewsScreen navigation={navigation} user={user} initialTab="received" />;
};

export default UniversalReviewManagementScreen;
