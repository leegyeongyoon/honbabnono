import React from 'react';
import UniversalJoinedMeetupsScreen from '../components/shared/UniversalJoinedMeetupsScreen';

interface JoinedMeetupsScreenProps {
  navigation: any;
  user?: any;
}

const JoinedMeetupsScreen: React.FC<JoinedMeetupsScreenProps> = ({ navigation, user }) => {
  return (
    <UniversalJoinedMeetupsScreen
      navigation={navigation}
      user={user}
    />
  );
};

export default JoinedMeetupsScreen;