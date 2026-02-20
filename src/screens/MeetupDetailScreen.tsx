import React from 'react';
import { View, Modal, StyleSheet, SafeAreaView } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useTypedNavigation } from '../hooks/useNavigation';
import UniversalMeetupDetailScreen from '../components/shared/UniversalMeetupDetailScreen';
import { DepositSelector } from '../components/DepositSelector';
import StaticMapView from '../components/StaticMapView';
import Header from '../components/Header';
import ErrorState from '../components/ErrorState';
import { COLORS } from '../styles/colors';

const MeetupDetailScreen = () => {
  const route = useRoute<any>();
  const navigation = useTypedNavigation();

  let rawMeetupId = route.params?.meetupId || route.params?.id;

  if (typeof rawMeetupId === 'object' && rawMeetupId !== null) {
    rawMeetupId = rawMeetupId.id || rawMeetupId.meetupId || String(rawMeetupId);
  }

  const meetupId = typeof rawMeetupId === 'string' ? rawMeetupId : undefined;

  const navigationAdapter = {
    navigate: (screen: string, params?: any) => {
      navigation.navigate(screen as any, params);
    },
    goBack: () => {
      navigation.goBack();
    },
  };

  if (!meetupId) {
    return (
      <SafeAreaView style={styles.container}>
        <Header
          mode="sub"
          title="약속 상세"
          onBackPress={navigation.goBack}
          showNotification={false}
        />
        <View style={styles.errorContainer}>
          <ErrorState
            title="약속을 찾을 수 없습니다"
            description="잘못된 접근이거나 삭제된 약속입니다"
            onRetry={navigation.goBack}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header
        mode="sub"
        title="약속 상세"
        onBackPress={navigation.goBack}
        showNotification={false}
      />
      <View style={styles.content}>
        <UniversalMeetupDetailScreen
          navigation={navigationAdapter}
          meetupId={meetupId}
          ModalComponent={Modal}
          DepositSelectorComponent={DepositSelector}
          KakaoMapComponent={StaticMapView}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  content: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MeetupDetailScreen;
