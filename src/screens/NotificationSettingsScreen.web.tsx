import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, SHADOWS, CARD_STYLE } from '../styles/colors';
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
  const [settings, setSettings] = useState<NotificationSettings | null>(null);

  useEffect(() => {
    const fetchNotificationSettings = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/user/notification-settings');
        // API 응답 구조: { success: true, data: settings }
        if (response.data && response.data.success && response.data.data) {
          const apiSettings = response.data.data;
          // DB 컬럼명을 프론트엔드 형식으로 변환
          setSettings({
            pushNotifications: apiSettings.push_notifications || false,
            emailNotifications: apiSettings.email_notifications || false,
            meetupReminders: apiSettings.meetup_reminders || false,
            chatMessages: apiSettings.chat_notifications || false,
            marketingEmails: apiSettings.marketing_notifications || false,
            weeklyDigest: true, // 백엔드에 없는 설정은 기본값 사용
          });
        } else {
          // 기본값 설정
          setSettings({
            pushNotifications: true,
            emailNotifications: true,
            meetupReminders: true,
            chatMessages: true,
            marketingEmails: false,
            weeklyDigest: true,
          });
        }
      } catch (error) {
        // 오류 발생시에도 기본값 설정
        setSettings({
          pushNotifications: true,
          emailNotifications: true,
          meetupReminders: true,
          chatMessages: true,
          marketingEmails: false,
          weeklyDigest: true,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchNotificationSettings();
  }, []);

  const handleSettingChange = async (key: keyof NotificationSettings, value: boolean) => {
    if (!settings) {return;} // settings가 null이면 아무것도 하지 않음

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    try {
      // 프론트엔드 필드명을 백엔드 snake_case로 변환
      const backendFieldMap = {
        pushNotifications: 'push_notifications',
        emailNotifications: 'email_notifications',
        meetupReminders: 'meetup_reminders',
        chatMessages: 'chat_notifications',
        marketingEmails: 'marketing_notifications',
        weeklyDigest: 'weekly_digest', // 백엔드에 없는 필드, 무시됨
      };

      const backendKey = backendFieldMap[key];
      if (backendKey) {
        await apiClient.put('/user/notification-settings', {
          [backendKey]: value
        });
      }
    } catch (error) {
      // 실패시 원래 값으로 되돌리기
      setSettings(settings);
    }
  };

  const renderSettingItem = (
    key: keyof NotificationSettings,
    title: string,
    description: string,
    icon: string
  ) => {
    // settings가 undefined이거나 null인 경우를 안전하게 처리
    const settingValue = settings && typeof settings[key] === 'boolean' ? settings[key] : false;

    return (
      <View key={key} style={styles.settingItem}>
        <View style={styles.settingIconContainer}>
          <Icon name={icon} size={20} color="#C49A70" />
        </View>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingDescription}>{description}</Text>
        </View>
        <Switch
          value={settingValue}
          onValueChange={(value) => handleSettingChange(key, value)}
          trackColor={{ false: '#DAD5CF', true: 'rgba(196,154,112,0.3)' }}
          thumbColor={settingValue ? '#C49A70' : '#B0A89E'}
        />
      </View>
    );
  };

  if (loading || !settings) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigate('/mypage')}>
            <Icon name="arrow-left" size={24} color="#1A1714" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>알림 설정</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={{ padding: 20, gap: 16 }}>
          {[0, 1, 2].map((section) => (
            <View key={section} className="animate-shimmer" style={{ backgroundColor: '#FAFAF8', borderRadius: 8, padding: 20, gap: 16 }}>
              <View style={{ width: '30%', height: 14, borderRadius: 7, backgroundColor: '#EFECEA' }} />
              {[0, 1, 2].map((row) => (
                <View key={row} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ gap: 6, flex: 1 }}>
                    <View style={{ width: '60%', height: 14, borderRadius: 7, backgroundColor: '#EFECEA' }} />
                    <View style={{ width: '80%', height: 10, borderRadius: 5, backgroundColor: '#EFECEA' }} />
                  </View>
                  <View style={{ width: 48, height: 28, borderRadius: 14, backgroundColor: '#EFECEA' }} />
                </View>
              ))}
            </View>
          ))}
        </View>
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
          <Icon name="arrow-left" size={24} color="#1A1714" />
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
              'megaphone'
            )}
            {renderSettingItem(
              'weeklyDigest',
              '주간 리포트',
              '주간 활동 요약을 받습니다',
              'list'
            )}
          </View>
        </View>

        {/* 알림 시간 설정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>알림 시간 설정</Text>
          <View style={styles.infoCard}>
            <Icon name="info" size={20} color="#C49A70" />
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
    backgroundColor: '#EFECEA',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#5C4F42',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.06)',
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    zIndex: 10,
  },
  backButton: {
    padding: 10,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 200ms ease',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1714',
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
    color: '#1A1714',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#EFECEA',
  },
  settingsContainer: {
    backgroundColor: COLORS.neutral.white,
    marginHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.06)',
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.06)',
    cursor: 'pointer',
    transition: 'all 200ms ease',
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7F5F3',
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
    color: '#1A1714',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#5C4F42',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(196,154,112,0.06)',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(196,154,112,0.10)',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#5C4F42',
    lineHeight: 20,
  },
});

export default NotificationSettingsScreen;
