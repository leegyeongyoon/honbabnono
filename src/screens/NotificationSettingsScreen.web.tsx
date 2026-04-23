import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useNavigate } from 'react-router-dom';
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
    isLast?: boolean
  ) => {
    // settings가 undefined이거나 null인 경우를 안전하게 처리
    const settingValue = settings && typeof settings[key] === 'boolean' ? settings[key] : false;

    return (
      <View
        key={key}
        style={[
          styles.settingItem,
          !isLast && styles.settingItemBorder,
        ]}
      >
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingDescription}>{description}</Text>
        </View>
        <Switch
          value={settingValue}
          onValueChange={(value) => handleSettingChange(key, value)}
          trackColor={{ false: '#d1d5db', true: '#d1d5db' }}
          thumbColor={settingValue ? '#6b7280' : '#ffffff'}
        />
      </View>
    );
  };

  if (loading || !settings) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigate('/mypage')}>
            <Text style={styles.backArrow}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>알림설정</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.content}>
          {[0, 1, 2].map((section) => (
            <View key={section} style={styles.skeletonSection}>
              <View style={styles.skeletonSectionTitle} />
              {[0, 1].map((row) => (
                <View key={row} style={styles.skeletonRow}>
                  <View style={styles.skeletonTextGroup}>
                    <View style={styles.skeletonTitle} />
                    <View style={styles.skeletonDesc} />
                  </View>
                  <View style={styles.skeletonToggle} />
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
          <Text style={styles.backArrow}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>알림설정</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* 기본 알림 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>기본 알림</Text>
          {renderSettingItem(
            'pushNotifications',
            '푸시알림',
            '앱에서 보내는 모든 알림을 받습니다'
          )}
          {renderSettingItem(
            'emailNotifications',
            '이메일 알림',
            '중요한 알림을 이메일로 받습니다',
            true
          )}
        </View>

        <View style={styles.sectionDivider} />

        {/* 모임 알림 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>모임 알림</Text>
          {renderSettingItem(
            'meetupReminders',
            '모임 리마인더',
            '모임 시작 전 미리 알려드립니다'
          )}
          {renderSettingItem(
            'chatMessages',
            '채팅 메시지',
            '모임 채팅방의 새 메시지 알림',
            true
          )}
        </View>

        <View style={styles.sectionDivider} />

        {/* 마케팅 알림 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>마케팅 알림</Text>
          {renderSettingItem(
            'marketingEmails',
            '마케팅 이메일',
            '이벤트, 할인 정보 등을 받습니다'
          )}
          {renderSettingItem(
            'weeklyDigest',
            '주간 리포트',
            '주간 활동 요약을 받습니다',
            true
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.06)',
  },
  backButton: {
    padding: 10,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  backArrow: {
    fontSize: 20,
    fontWeight: '600',
    color: '#121212',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#121212',
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
    paddingTop: 8,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#121212',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionDivider: {
    height: 8,
    backgroundColor: '#F5F5F5',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  settingItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.06)',
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#121212',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#878b94',
  },
  // Skeleton loading styles
  skeletonSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  skeletonSectionTitle: {
    width: '30%',
    height: 14,
    borderRadius: 7,
    backgroundColor: '#F0F0F0',
    marginBottom: 4,
  },
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skeletonTextGroup: {
    gap: 6,
    flex: 1,
  },
  skeletonTitle: {
    width: '50%',
    height: 14,
    borderRadius: 7,
    backgroundColor: '#F0F0F0',
  },
  skeletonDesc: {
    width: '70%',
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F0F0F0',
  },
  skeletonToggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0F0F0',
  },
});

export default NotificationSettingsScreen;
