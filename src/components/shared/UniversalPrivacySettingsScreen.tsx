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
    } catch (_error) {
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
    } catch (_error) {
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
          trackColor={{ false: COLORS.neutral.grey200, true: COLORS.primary.accent + '40' }}
          thumbColor={settings[key] ? COLORS.primary.accent : COLORS.neutral.grey300}
        />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.placeholder} />
          <Text style={styles.headerTitle}>개인정보 설정</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary.accent} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.placeholder} />
        <Text style={styles.headerTitle}>개인정보 설정</Text>
        <View style={styles.placeholder}>
          {saving && <ActivityIndicator size="small" color={COLORS.primary.accent} />}
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
                {settings?.profileVisibility === visibility && (
                  <Icon name="check" size={18} color={COLORS.primary.accent} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>활동 정보</Text>
          <View style={styles.settingsContainer}>
            {renderSwitch('showActivityStatus', '활동 상태 표시', '다른 사용자에게 온라인 상태를 보여줍니다')}
            {renderSwitch('showLocation', '위치 정보 공유', '약속 위치 기반 추천을 받습니다')}
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
            잇테이블은 회원님의 개인정보를 소중히 보호합니다.
            자세한 내용은 개인정보 처리방침을 확인해주세요.
          </Text>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('PrivacyPolicy')}
          >
            <Text style={styles.linkButtonText}>개인정보 처리방침 보기</Text>
            <Icon name="external-link" size={16} color={COLORS.primary.accent} />
          </TouchableOpacity>
        </View>

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
    ...SHADOWS.sticky,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
    letterSpacing: -0.3,
  },
  placeholder: {
    width: 24,
  },
  loadingContainer: {
    flex: 1,
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
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.tertiary,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  settingsContainer: {
    backgroundColor: COLORS.neutral.white,
    marginHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.06)',
    ...SHADOWS.small,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.06)',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
    letterSpacing: -0.1,
  },
  settingDescription: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    lineHeight: 18,
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.06)',
  },
  selectedOption: {
    backgroundColor: COLORS.primary.accent + '08',
  },
  optionText: {
    fontSize: 15,
    color: COLORS.text.primary,
  },
  selectedOptionText: {
    color: COLORS.primary.accent,
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: COLORS.neutral.white,
    margin: 16,
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.06)',
    ...SHADOWS.small,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
    letterSpacing: -0.1,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
    marginBottom: 14,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary.accent,
    borderRadius: 6,
    paddingVertical: 10,
    gap: 6,
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary.accent,
  },
  bottomSpacer: {
    height: 40,
  },
});

export default UniversalPrivacySettingsScreen;
