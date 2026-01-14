import React from 'react';
import UniversalPaymentScreen from '../components/shared/UniversalPaymentScreen';

const DepositPaymentScreen = ({ navigation, user, route }: any) => {
  return <UniversalPaymentScreen navigation={navigation} user={user} route={route} />;
};

export default DepositPaymentScreen;