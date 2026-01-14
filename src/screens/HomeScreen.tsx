import React from 'react';
import { Modal } from 'react-native';
import { useTypedNavigation } from '../hooks/useNavigation';
import { useUserStore } from '../store/userStore';
import UniversalHomeScreen from '../components/shared/UniversalHomeScreen';
import CreateMeetupWizard from './CreateMeetupWizard';
import MapTestScreen from './MapTestScreen';
import NeighborhoodSelector from '../components/NeighborhoodSelector';

// Platform-specific modal wrapper for CreateMeetup
const CreateMeetupModal = ({ visible, onClose, onSuccess, navigation, user }) => (
  <Modal visible={visible} animationType="slide">
    <CreateMeetupWizard 
      navigation={navigation}
      user={user}
      onClose={onClose}
    />
  </Modal>
);

// Platform-specific modal wrapper for MapTest
const MapTestModal = ({ visible, onClose }) => {
  if (!visible) return null;
  return <MapTestScreen />;
};

// Platform-specific modal wrapper for NeighborhoodSelector
const NeighborhoodModal = ({ visible, onClose, onLocationSelect, currentLocation }) => (
  <NeighborhoodSelector
    visible={visible}
    onClose={onClose}
    onLocationSelect={onLocationSelect}
    currentLocation={currentLocation}
  />
);

const HomeScreen = (props) => {
  const navigation = useTypedNavigation();
  const { user } = useUserStore();
  
  // Navigation adapter for React Navigation
  const navigationAdapter = {
    navigate: (screen, params) => {
      navigation.navigate(screen, params);
    }
  };

  // Enhanced CreateMeetupModal with user and navigation
  const CreateMeetupModalWithProps = (modalProps) => (
    <CreateMeetupModal 
      {...modalProps}
      navigation={navigation}
      user={user}
    />
  );

  return (
    <UniversalHomeScreen
      navigation={navigationAdapter}
      CreateMeetupModal={CreateMeetupModalWithProps}
      MapTestModal={MapTestModal}
      NeighborhoodModal={NeighborhoodModal}
      {...props}
    />
  );
};

export default HomeScreen;