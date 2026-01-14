import React from 'react';
import { useUserStore } from '../store/userStore';
import UniversalPointChargeScreen from '../components/shared/UniversalPointChargeScreen';

interface PointChargeScreenProps {
  navigation?: any;
}

const PointChargeScreen: React.FC<PointChargeScreenProps> = ({ navigation }) => {
  const { user } = useUserStore();

  return (
    <UniversalPointChargeScreen
      navigation={navigation}
      user={user}
    />
  );
};

export default PointChargeScreen;