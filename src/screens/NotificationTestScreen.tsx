import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { COLORS } from '../styles/colors';
import nativeBridge from '../utils/nativeBridge';
import { usePopup } from '../hooks/usePopup';
import Popup from '../components/Popup';

const NotificationTestScreen: React.FC = () => {
  const { popupState, showSuccess, showError, showInfo, hidePopup } = usePopup();

  const handleInstantNotification = () => {
    nativeBridge.showNotification(
      '혼밥노노 알림',
      '즉시 알림 테스트입니다!',
      { type: 'test' }
    );
    showSuccess('즉시 알림이 발송되었습니다.');
  };

  const handleDelayedNotification = (delay: number) => {
    nativeBridge.scheduleNotification(
      '혼밥노노 예약 알림',
      `${delay}초 후 알림 테스트입니다!`,
      delay,
      { type: 'scheduled' }
    );
    showInfo(`${delay}초 후 알림이 예약되었습니다.`);
  };

  const handleMeetupNotification = () => {
    nativeBridge.showNotification(
      '새로운 모임',
      '근처에 새로운 밥모임이 생성되었어요!',
      { 
        type: 'meetup',
        meetupId: '123',
        action: 'new_meetup'
      }
    );
    showSuccess('모임 알림이 발송되었습니다.');
  };

  const handleChatNotification = () => {
    nativeBridge.showNotification(
      '김철수',
      '안녕하세요! 오늘 저녁 식사 같이 하실래요?',
      { 
        type: 'chat',
        chatId: '456',
        userId: '789'
      }
    );
    showSuccess('채팅 알림이 발송되었습니다.');
  };

  const handleHapticFeedback = () => {
    nativeBridge.haptic();
    showInfo('햅틱 피드백이 실행되었습니다.');
  };

  const testButtons = [
    {
      title: '즉시 알림 테스트',
      subtitle: '바로 알림을 표시합니다',
      onPress: handleInstantNotification,
      color: COLORS.primary.main,
    },
    {
      title: '5초 후 알림',
      subtitle: '5초 뒤에 알림을 표시합니다',
      onPress: () => handleDelayedNotification(5),
      color: COLORS.functional.warning,
    },
    {
      title: '10초 후 알림',
      subtitle: '10초 뒤에 알림을 표시합니다',
      onPress: () => handleDelayedNotification(10),
      color: COLORS.functional.info,
    },
    {
      title: '모임 알림 시뮬레이션',
      subtitle: '새 모임 생성 알림을 테스트합니다',
      onPress: handleMeetupNotification,
      color: COLORS.secondary.main,
    },
    {
      title: '채팅 알림 시뮬레이션',
      subtitle: '새 채팅 메시지 알림을 테스트합니다',
      onPress: handleChatNotification,
      color: COLORS.functional.success,
    },
    {
      title: '햅틱 피드백',
      subtitle: '진동 피드백을 테스트합니다',
      onPress: handleHapticFeedback,
      color: COLORS.neutral.grey600,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>알림 테스트</Text>
        <Text style={styles.subtitle}>
          다양한 알림 기능을 테스트해보세요
        </Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* 디바이스 정보 */}
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>디바이스 정보</Text>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>환경:</Text>
              <Text style={styles.infoValue}>
                {nativeBridge.isNativeApp() ? 'Native App' : 'Web Browser'}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>플랫폼:</Text>
              <Text style={styles.infoValue}>{nativeBridge.getDeviceType()}</Text>
            </View>
          </View>

          {/* 테스트 버튼들 */}
          <View style={styles.buttonSection}>
            {testButtons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.testButton, { borderLeftColor: button.color }]}
                onPress={button.onPress}
              >
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonTitle}>{button.title}</Text>
                  <Text style={styles.buttonSubtitle}>{button.subtitle}</Text>
                </View>
                <View style={[styles.buttonIcon, { backgroundColor: button.color }]}>
                  <Text style={styles.buttonIconText}>▶</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* 주의사항 */}
          <View style={styles.warningSection}>
            <Text style={styles.warningTitle}>⚠️ 주의사항</Text>
            <Text style={styles.warningText}>
              • iOS에서는 알림 권한이 필요합니다{'\n'}
              • 앱이 백그라운드에 있을 때 알림이 표시됩니다{'\n'}
              • 웹 브라우저에서는 브라우저 알림이 사용됩니다{'\n'}
              • 시뮬레이터에서는 알림이 표시되지 않을 수 있습니다
            </Text>
          </View>
        </View>
      </ScrollView>

      <Popup
        visible={popupState.visible}
        onClose={hidePopup}
        title={popupState.title}
        message={popupState.message}
        type={popupState.type}
        buttons={popupState.buttons}
        showCloseButton={popupState.showCloseButton}
        backdrop={popupState.backdrop}
        animation={popupState.animation}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.white,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  infoSection: {
    backgroundColor: COLORS.neutral.grey50,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 16,
    color: COLORS.text.secondary,
    width: 80,
  },
  infoValue: {
    fontSize: 16,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  buttonSection: {
    gap: 16,
    marginBottom: 24,
  },
  testButton: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonContent: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  buttonSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  buttonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonIconText: {
    color: COLORS.neutral.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  warningSection: {
    backgroundColor: COLORS.functional.warningLight,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.functional.warning,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.functional.warning,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
});

export default NotificationTestScreen;