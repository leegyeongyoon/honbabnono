import React from 'react';
import UniversalMyReviewsScreen from '../components/shared/UniversalMyReviewsScreen';

const MyReviewsScreen = ({ navigation, user }: any) => {
  return <UniversalMyReviewsScreen navigation={navigation} user={user} />;
};

export default MyReviewsScreen;