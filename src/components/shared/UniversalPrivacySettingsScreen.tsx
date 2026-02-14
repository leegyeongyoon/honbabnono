import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator } from 'react-native';
import { COLORS, SHADOWS } from '../../styles/colors';
import { Icon } from '../Icon';
import userApiService from '../../services/userApiService';

interface NavigationAdapter {
  navigate: (screen: string, params?: any) => void;
  goBack: () => void;
}

interface PrivacySettings {
  profileVisibility: 'public' | 'friends' | 'private';
  showActivityStatus: boolean;
  showLocation: boolean;
  allowDirectMessages: boolean;
  showInSearchResults: boolean;
  dataCollection: boolean;
  marketingEmails: boolean;
}

const UniversalPrivacySettingsScreen: React.FC<{navigation: NavigationAdapter, user?: any}> = ({ 
  navigation, user 
}) => {
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchPrivacySettings = useCallback(async () => {
    try {
      setLoading(true);

      const response = await userApiService.getPrivacySettings();

      const data = response.data || response.settings || response;
      setSettings(data || {
        profileVisibility: 'public',
        showActivityStatus: true,
        showLocation: true,
        allowDirectMessages: true,
        showInSearchResults: true,
        dataCollection: true,
        marketingEmails: false,
      });
    } catch (error) {
      console.error('개인정보 설정 조회 실패:', error);
      setSettings({
        profileVisibility: 'public',
        showActivityStatus: true,
        showLocation: true,
        allowDirectMessages: true,
        showInSearchResults: true,
        dataCollection: true,
        marketingEmails: false,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPrivacySettings(); }, [fetchPrivacySettings]);

  const updateSetting = async (key: keyof PrivacySettings, value: any) => {
    if (!settings) {return;}

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    try {
      setSaving(true);
      await userApiService.updatePrivacySettings({ [key]: value });
    } catch (error) {
      console.error('설정 업데이트 실패:', error);
      setSettings(settings);
    } finally {
      setSaving(false);
    }
  };

  const renderSwitch = (key: keyof PrivacySettings, title: string, description: string) => {
    if (!settings || typeof settings[key] !== 'boolean') {return null;}
    
    return (
      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingDescription}>{description}</Text>
        </View>
        <Switch
          value={settings[key] as boolean}
          onValueChange={(value) => updateSetting(key, value)}
          disabled={saving}
          trackColor={{ false: COLORS.neutral.grey200, true: COLORS.primary.light }}
          thumbColor={settings[key] ? COLORS.primary.main : COLORS.neutral.grey300}
        />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={{ width: 24 }} />
          <Text style={styles.headerTitle}>개인정보 설정</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary.main} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ width: 24 }} />
        <Text style={styles.headerTitle}>개인정보 설정</Text>
        <View style={{ width: 24 }}>
          {saving && <ActivityIndicator size="small" color={COLORS.primary.main} />}
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>프로필 공개 범위</Text>
          <View style={styles.settingsContainer}>
            {['public', 'friends', 'private'].map(visibility => (
              <TouchableOpacity
                key={visibility}
                style={[
                  styles.visibilityOption,
                  settings?.profileVisibility === visibility && styles.selectedOption,
                ]}
                onPress={() => updateSetting('profileVisibility', visibility as any)}
              >
                <Text style={[
                  styles.optionText,
                  settings?.profileVisibility === visibility && styles.selectedOptionText,
                ]}>
                  {visibility === 'public' ? '전체 공개' : 
                   visibility === 'friends' ? '친구만' : '비공개'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>활동 정보</Text>
          <View style={styles.settingsContainer}>
            {renderSwitch('showActivityStatus', '활동 상태 표시', '다른 사용자에게 온라인 상태를 보여줍니다')}
            {renderSwitch('showLocation', '위치 정보 공유', '모임 위치 기반 추천을 받습니다')}
            {renderSwitch('showInSearchResults', '검색 결과 표시', '다른 사용자의 검색 결과에 표시됩니다')}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>소통 설정</Text>
          <View style={styles.settingsContainer}>
            {renderSwitch('allowDirectMessages', '직접 메시지 허용', '다른 사용자가 직접 메시지를 보낼 수 있습니다')}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>데이터 및 마케팅</Text>
          <View style={styles.settingsContainer}>
            {renderSwitch('dataCollection', '서비스 개선을 위한 데이터 수집', '더 나은 서비스 제공을 위해 익명 데이터를 수집합니다')}
            {renderSwitch('marketingEmails', '마케팅 이메일 수신', '이벤트 및 혜택 정보를 이메일로 받습니다')}
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>개인정보 처리방침</Text>
          <Text style={styles.infoText}>
            혼밥노노는 회원님의 개인정보를 소중히 보호합니다. 
            자세한 내용은 개인정보 처리방침을 확인해주세요.
          </Text>
          <TouchableOpacity 
            style={styles.linkButton}
            onPress={() => navigation.navigate('PrivacyPolicy')}
          >
            <Text style={styles.linkButtonText}>개인정보 처리방침 보기</Text>
            <Icon name="external-link" size={16} color={COLORS.primary.main} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.neutral.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
    backgroundColor: COLORS.neutral.white, ...SHADOWS.small,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text.primary },
  content: { flex: 1 },
  section: { marginBottom: 8 },
  sectionTitle: {
    fontSize: 18, fontWeight: '700', color: COLORS.text.primary,
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: COLORS.neutral.background,
  },
  settingsContainer: { backgroundColor: COLORS.neutral.white, marginHorizontal: 16, borderRadius: 16, ...SHADOWS.small },
  settingItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: COLORS.neutral.grey200,
  },
  settingInfo: { flex: 1, marginRight: 16 },
  settingTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text.primary, marginBottom: 2 },
  settingDescription: { fontSize: 13, color: COLORS.text.secondary, lineHeight: 18 },
  visibilityOption: {
    paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: COLORS.neutral.grey200,
  },
  selectedOption: { backgroundColor: COLORS.primary.main + '10' },
  optionText: { fontSize: 16, color: COLORS.text.primary },
  selectedOptionText: { color: COLORS.primary.main, fontWeight: '600' },
  infoSection: {
    backgroundColor: COLORS.neutral.white, margin: 16, padding: 20, borderRadius: 16, ...SHADOWS.small,
  },
  infoTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text.primary, marginBottom: 8 },
  infoText: { fontSize: 14, color: COLORS.text.secondary, lineHeight: 20, marginBottom: 12 },
  linkButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.primary.main, borderRadius: 8, paddingVertical: 10, gap: 4,
  },
  linkButtonText: { fontSize: 14, fontWeight: '500', color: COLORS.primary.main },
});

export default UniversalPrivacySettingsScreen;