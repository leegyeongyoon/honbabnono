import React from 'react';
import UniversalBlockedUsersScreen from '../components/shared/UniversalBlockedUsersScreen';

const BlockedUsersScreen = ({ navigation, user }: any) => {
  return <UniversalBlockedUsersScreen navigation={navigation} user={user} />;
};

export default BlockedUsersScreen;