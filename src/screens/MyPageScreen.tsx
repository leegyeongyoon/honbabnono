import React from 'react';
import ProfileScreen from './ProfileScreen';

interface MyPageScreenProps {
  navigation?: any;
  user?: any;
  onLogout?: () => void;
}

const MyPageScreen: React.FC<MyPageScreenProps> = ({ navigation, user, onLogout }) => {
  return <ProfileScreen navigation={navigation} user={user} onLogout={onLogout} />;
};

export default MyPageScreen;