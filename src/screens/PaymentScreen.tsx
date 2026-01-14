import React from 'react';
import UniversalPaymentScreen from '../components/shared/UniversalPaymentScreen';

const PaymentScreen = ({ navigation, user, route }: any) => {
  return <UniversalPaymentScreen navigation={navigation} user={user} route={route} />;
};

export default PaymentScreen;