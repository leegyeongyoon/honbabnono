import React from 'react';
import UniversalMyActivitiesScreen from '../components/shared/UniversalMyActivitiesScreen';

const MyActivitiesScreen = ({ navigation, user }: any) => {
  return <UniversalMyActivitiesScreen navigation={navigation} user={user} />;
};

export default MyActivitiesScreen;