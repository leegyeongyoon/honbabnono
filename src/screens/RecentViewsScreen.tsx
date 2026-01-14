import React from 'react';
import UniversalRecentViewsScreen from '../components/shared/UniversalRecentViewsScreen';

const RecentViewsScreen = ({ navigation, user }: any) => {
  return <UniversalRecentViewsScreen navigation={navigation} user={user} />;
};

export default RecentViewsScreen;