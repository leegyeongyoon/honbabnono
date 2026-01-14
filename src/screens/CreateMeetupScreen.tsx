import React from 'react';
import { useUserStore } from '../store/userStore';
import UniversalCreateMeetupScreen from '../components/shared/UniversalCreateMeetupScreen';

interface CreateMeetupScreenProps {
  navigation?: any;
  onClose?: () => void;
}

const CreateMeetupScreen: React.FC<CreateMeetupScreenProps> = ({ navigation, onClose }) => {
  const { user } = useUserStore();

  return (
    <UniversalCreateMeetupScreen
      navigation={navigation}
      user={user}
      onGoBack={onClose || (() => navigation?.goBack())}
    />
  );
};

export default CreateMeetupScreen;