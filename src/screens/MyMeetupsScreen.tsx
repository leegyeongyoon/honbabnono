import React from 'react';
import { useUserStore } from '../store/userStore';
import UniversalMyMeetupsScreen from '../components/shared/UniversalMyMeetupsScreen';

interface MyMeetupsScreenProps {
  navigation?: any;
}

const MyMeetupsScreen: React.FC<MyMeetupsScreenProps> = ({ navigation }) => {
  const { user } = useUserStore();

  return (
    <UniversalMyMeetupsScreen
      navigation={navigation}
      user={user}
    />
  );
};

export default MyMeetupsScreen;