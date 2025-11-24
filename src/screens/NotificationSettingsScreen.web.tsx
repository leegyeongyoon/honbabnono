import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, SHADOWS } from '../styles/colors';
import { Icon } from '../components/Icon';
import apiClient from '../services/apiClient';

interface NotificationSettings {
  pushNotifications: boolean;
  emailNotifications: boolean;
  meetupReminders: boolean;
  chatMessages: boolean;
  marketingEmails: boolean;
  weeklyDigest: boolean;
}

const NotificationSettingsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<NotificationSettings>({
    pushNotifications: true,
    emailNotifications: true,
    meetupReminders: true,
    chatMessages: true,
    marketingEmails: false,
    weeklyDigest: true,
  });

  useEffect(() => {
    const fetchNotificationSettings = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/user/notification-settings');
        setSettings(response.data.settings);
      } catch (error) {
        console.error('알림 설정 조회 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotificationSettings();
  }, []);

  const handleSettingChange = async (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    try {
      await apiClient.put('/user/notification-settings', {
        [key]: value
      });
      console.log('알림 설정이 업데이트되었습니다.');
    } catch (error) {
      console.error('알림 설정 업데이트 실패:', error);
      // 실패시 원래 값으로 되돌리기
      setSettings(settings);
    }
  };

  const renderSettingItem = (
    key: keyof NotificationSettings,
    title: string,
    description: string,
    icon: string
  ) => (
    <View key={key} style={styles.settingItem}>
      <View style={styles.settingIconContainer}>
        <Text style={styles.settingIcon}>{icon}</Text>
      </View>
      <View style={styles.settingInfo}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        value={settings[key]}
        onValueChange={(value) => handleSettingChange(key, value)}
        trackColor={{ false: COLORS.neutral.grey200, true: COLORS.primary.light }}
        thumbColor={settings[key] ? COLORS.primary.main : COLORS.neutral.grey300}
      />
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.loadingText}>알림 설정을 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigate('/mypage')}
        >
          <Icon name="arrow-left" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>알림 설정</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* 기본 알림 설정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>기본 알림</Text>
          <View style={styles.settingsContainer}>
            {renderSettingItem(
              'pushNotifications',
              '푸시 알림',
              '앱에서 보내는 모든 알림을 받습니다',
              '🔔'
            )}
            {renderSettingItem(
              'emailNotifications',
              '이메일 알림',
              '중요한 알림을 이메일로 받습니다',
              '📧'
            )}
          </View>
        </View>

        {/* 모임 관련 알림 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>모임 알림</Text>
          <View style={styles.settingsContainer}>
            {renderSettingItem(
              'meetupReminders',
              '모임 리마인더',
              '모임 시작 전 미리 알려드립니다',
              '⏰'
            )}
            {renderSettingItem(
              'chatMessages',
              '채팅 메시지',
              '모임 채팅방의 새 메시지 알림',
              '💬'
            )}
          </View>
        </View>

        {/* 마케팅 알림 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>마케팅 알림</Text>
          <View style={styles.settingsContainer}>
            {renderSettingItem(
              'marketingEmails',
              '마케팅 이메일',
              '이벤트, 할인 정보 등을 받습니다',
              '🎯'
            )}
            {renderSettingItem(
              'weeklyDigest',
              '주간 리포트',
              '주간 활동 요약을 받습니다',
              '📊'
            )}
          </View>
        </View>

        {/* 알림 시간 설정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>알림 시간 설정</Text>
          <View style={styles.infoCard}>
            <Icon name="info" size={20} color={COLORS.primary.main} />
            <Text style={styles.infoText}>
              모임 리마인더는 모임 시작 30분 전, 10분 전에 발송됩니다.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.neutral.white,
    ...SHADOWS.small,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.neutral.background,
  },
  settingsContainer: {
    backgroundColor: COLORS.neutral.white,
    marginHorizontal: 16,
    borderRadius: 16,
    ...SHADOWS.small,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.neutral.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingIcon: {
    fontSize: 18,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary.light,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: COLORS.primary.dark,
    lineHeight: 20,
  },
});

export default NotificationSettingsScreen;