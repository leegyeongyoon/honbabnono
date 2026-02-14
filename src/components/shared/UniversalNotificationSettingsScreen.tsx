import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { COLORS, SHADOWS } from '../../styles/colors';
import { Icon } from '../Icon';
import userApiService from '../../services/userApiService';

// Platform-specific navigation adapter
interface NavigationAdapter {
  navigate: (screen: string, params?: any) => void;
  goBack: () => void;
  replace?: (screen: string, params?: any) => void;
}

interface UniversalNotificationSettingsScreenProps {
  navigation: NavigationAdapter;
  user?: any;
  onSettingsChange?: (settings: NotificationSettings) => void;
}

interface NotificationSettings {
  pushNotifications: boolean;
  emailNotifications: boolean;
  meetupReminders: boolean;
  chatMessages: boolean;
  marketingEmails: boolean;
  weeklyDigest: boolean;
}

const UniversalNotificationSettingsScreen: React.FC<UniversalNotificationSettingsScreenProps> = ({
  navigation,
  user,
  onSettingsChange,
}) => {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetch notification settings from backend
  const fetchNotificationSettings = useCallback(async () => {
    try {
      setLoading(true);

      const response = await userApiService.getNotificationSettings();

      const apiSettings = response.data || response;
      // DB 컬럼명을 프론트엔드 형식으로 변환
      const newSettings: NotificationSettings = {
        pushNotifications: apiSettings.push_notifications || false,
        emailNotifications: apiSettings.email_notifications || false,
        meetupReminders: apiSettings.meetup_reminders || false,
        chatMessages: apiSettings.chat_notifications || false,
        marketingEmails: apiSettings.marketing_notifications || false,
        weeklyDigest: true, // 백엔드에 없는 설정은 기본값 사용
      };

      setSettings(newSettings);

      if (onSettingsChange) {
        onSettingsChange(newSettings);
      }
    } catch (error) {
      console.error('알림 설정 조회 실패:', error);

      // 오류 발생시 기본값 설정
      const defaultSettings: NotificationSettings = {
        pushNotifications: true,
        emailNotifications: true,
        meetupReminders: true,
        chatMessages: true,
        marketingEmails: false,
        weeklyDigest: true,
      };

      setSettings(defaultSettings);

      if (onSettingsChange) {
        onSettingsChange(defaultSettings);
      }
    } finally {
      setLoading(false);
    }
  }, [onSettingsChange]);

  // Update notification settings
  const handleSettingChange = async (key: keyof NotificationSettings, value: boolean) => {
    if (!settings) {return;}

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    if (onSettingsChange) {
      onSettingsChange(newSettings);
    }

    try {
      setSaving(true);

      // 프론트엔드 필드명을 백엔드 snake_case로 변환
      const backendFieldMap: { [key in keyof NotificationSettings]: string } = {
        pushNotifications: 'push_notifications',
        emailNotifications: 'email_notifications',
        meetupReminders: 'meetup_reminders',
        chatMessages: 'chat_notifications',
        marketingEmails: 'marketing_notifications',
        weeklyDigest: 'weekly_digest', // 백엔드에 없는 필드, 무시됨
      };

      const backendKey = backendFieldMap[key];

      if (backendKey && backendKey !== 'weekly_digest') {
        await userApiService.updateNotificationSettings({
          [backendKey]: value
        });
      }
    } catch (error) {
      console.error('알림 설정 업데이트 실패:', error);

      // 실패시 원래 값으로 되돌리기
      setSettings(settings);

      if (onSettingsChange) {
        onSettingsChange(settings);
      }
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchNotificationSettings();
  }, [fetchNotificationSettings]);

  // Render setting item component
  const renderSettingItem = (
    key: keyof NotificationSettings,
    title: string,
    description: string,
    icon: string
  ) => {
    const settingValue = settings && typeof settings[key] === 'boolean' ? settings[key] : false;
    
    return (
      <View key={key} style={styles.settingItem}>
        <View style={styles.settingIconContainer}>
          <Icon name={icon} size={20} color={COLORS.primary.main} />
        </View>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingDescription}>{description}</Text>
        </View>
        <Switch
          value={settingValue}
          onValueChange={(value) => handleSettingChange(key, value)}
          trackColor={{ false: COLORS.neutral.grey200, true: COLORS.primary.light }}
          thumbColor={settingValue ? COLORS.primary.main : COLORS.neutral.grey300}
          disabled={saving}
        />
      </View>
    );
  };

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.primary.main} />
        <Text style={styles.loadingText}>알림 설정을 불러오는 중...</Text>
      </View>
    );
  }

  // Settings not loaded state
  if (!settings) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Icon name="alert-circle" size={48} color={COLORS.text.tertiary} />
        <Text style={styles.errorText}>설정을 불러올 수 없습니다</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchNotificationSettings}
        >
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.placeholder} />
        <Text style={styles.headerTitle}>알림 설정</Text>
        <View style={styles.placeholder}>
          {saving && (
            <ActivityIndicator size="small" color={COLORS.primary.main} />
          )}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 기본 알림 설정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>기본 알림</Text>
          <View style={styles.settingsContainer}>
            {renderSettingItem(
              'pushNotifications',
              '푸시 알림',
              '앱에서 보내는 모든 알림을 받습니다',
              'bell'
            )}
            {renderSettingItem(
              'emailNotifications',
              '이메일 알림',
              '중요한 알림을 이메일로 받습니다',
              'mail'
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
              'clock'
            )}
            {renderSettingItem(
              'chatMessages',
              '채팅 메시지',
              '모임 채팅방의 새 메시지 알림',
              'message-circle'
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
              'target'
            )}
            {renderSettingItem(
              'weeklyDigest',
              '주간 리포트',
              '주간 활동 요약을 받습니다',
              'bar-chart'
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

        {/* Platform-specific settings */}
        {Platform.OS === 'ios' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>iOS 설정</Text>
            <View style={styles.infoCard}>
              <Icon name="smartphone" size={20} color={COLORS.primary.main} />
              <Text style={styles.infoText}>
                시스템 설정에서 알림 권한을 확인해주세요. 설정 &gt; 알림 &gt; 혼밥노노
              </Text>
            </View>
          </View>
        )}

        {Platform.OS === 'android' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Android 설정</Text>
            <View style={styles.infoCard}>
              <Icon name="smartphone" size={20} color={COLORS.primary.main} />
              <Text style={styles.infoText}>
                시스템 설정에서 알림 권한을 확인해주세요. 설정 &gt; 앱 &gt; 혼밥노노 &gt; 알림
              </Text>
            </View>
          </View>
        )}

        <View style={styles.bottomSpacer} />
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
    marginTop: 12,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    marginTop: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.neutral.white,
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
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
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
    lineHeight: 18,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  bottomSpacer: {
    height: 40,
  },
});

export default UniversalNotificationSettingsScreen;