import React from 'react';
import { useTypedNavigation } from '../hooks/useNavigation';
import UniversalChatScreen from '../components/shared/UniversalChatScreen';

const ChatScreen = (props) => {
  const navigation = useTypedNavigation();
  
  const navigationAdapter = {
    navigate: (screen, params) => {
      navigation.navigate(screen, params);
    },
    goBack: () => {
      navigation.goBack();
    }
  };

  return (
    <UniversalChatScreen
      navigation={navigationAdapter}
      {...props}
    />
  );
};

export default ChatScreen;