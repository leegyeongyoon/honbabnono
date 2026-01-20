import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { COLORS, SHADOWS, LAYOUT } from '../../styles/colors';
import { Icon } from '../Icon';
import { useUserStore } from '../../store/userStore';

interface NavigationAdapter {
  navigate: (screen: string, params?: any) => void;
  goBack?: () => void;
}

interface UniversalSettingsScreenProps {
  navigation: NavigationAdapter;
  onLogout?: () => void;
}

// 메뉴 아이템 컴포넌트
const MenuItem: React.FC<{
  title: string;
  onPress: () => void;
  showArrow?: boolean;
  textColor?: string;
}> = ({ title, onPress, showArrow = true, textColor }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <Text style={[styles.menuItemText, textColor && { color: textColor }]}>
      {title}
    </Text>
    {showArrow && (
      <Icon name="chevron-right" size={20} color={COLORS.text.tertiary} />
    )}
  </TouchableOpacity>
);

// 섹션 헤더 컴포넌트
const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionHeaderText}>{title}</Text>
  </View>
);

const UniversalSettingsScreen: React.FC<UniversalSettingsScreenProps> = ({
  navigation,
  onLogout,
}) => {
  const { logout } = useUserStore();

  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '로그아웃 하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '로그아웃',
          style: 'destructive',
          onPress: () => {
            logout();
            if (onLogout) {
              onLogout();
            } else {
              navigation.navigate('Login');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '회원 탈퇴',
      '정말로 계정을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴',
          style: 'destructive',
          onPress: () => {
            // 계정 삭제 API 호출
            console.log('계정 삭제 요청');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack?.()}
          >
            <Icon name="chevron-left" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>설정</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerButton}>
              <Icon name="search" size={22} color={COLORS.text.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* 고객 지원 섹션 */}
          <SectionHeader title="고객 지원" />
          <View style={styles.menuSection}>
            <MenuItem
              title="공지사항"
              onPress={() => navigation.navigate('Notices')}
            />
            <MenuItem
              title="자주 묻는 질문"
              onPress={() => navigation.navigate('FAQ')}
            />
            <MenuItem
              title="고객센터"
              onPress={() => navigation.navigate('CustomerSupport')}
            />
            <MenuItem
              title="약관 및 정책"
              onPress={() => navigation.navigate('Terms')}
            />
            <MenuItem
              title="버전 정보"
              onPress={() => navigation.navigate('AppInfo')}
            />
          </View>

          {/* 설정 섹션 */}
          <SectionHeader title="설정" />
          <View style={styles.menuSection}>
            <MenuItem
              title="알림 설정"
              onPress={() => navigation.navigate('NotificationSettings')}
            />
          </View>

          {/* 계정 관리 */}
          <View style={styles.accountSection}>
            <TouchableOpacity style={styles.accountButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>로그아웃</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.accountButton}
              onPress={handleDeleteAccount}
            >
              <Text style={styles.deleteAccountText}>회원탈퇴</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: LAYOUT.HEADER_PADDING_VERTICAL,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text.tertiary,
  },
  menuSection: {
    backgroundColor: 'white',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  menuItemText: {
    fontSize: 16,
    color: COLORS.text.primary,
  },
  accountSection: {
    marginTop: 32,
    backgroundColor: 'white',
  },
  accountButton: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  logoutText: {
    fontSize: 16,
    color: COLORS.text.primary,
  },
  deleteAccountText: {
    fontSize: 16,
    color: COLORS.functional.error,
  },
  bottomSpacing: {
    height: 40,
  },
});

export default UniversalSettingsScreen;
