import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { COLORS, SHADOWS } from '../styles/colors';
import { useUserStore } from '../store/userStore';
import depositService from '../services/depositService';
import { UserPoints, PointTransaction, PointUsageOption } from '../types/deposit';
import Icon from './Icon';

interface PointsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const PointsModal: React.FC<PointsModalProps> = ({
  visible,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'usage' | 'history'>('overview');
  const [userPoints, setUserPoints] = useState<UserPoints | null>(null);
  const [pointHistory, setPointHistory] = useState<PointTransaction[]>([]);
  const [usageOptions, setUsageOptions] = useState<PointUsageOption[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useUserStore();

  useEffect(() => {
    if (visible && user) {
      loadPointsData();
    }
  }, [visible, user]);

  const loadPointsData = async () => {
    if (!user) {return;}

    setLoading(true);
    try {
      // 실제로는 API 호출로 대체될 예정
      const points = await depositService.getUserPoints(user.id);
      setUserPoints(points);

      const options = depositService.getPointUsageOptions();
      setUsageOptions(options.filter(option => option.isActive));

      // 포인트 내역도 로드 (추후 API 구현)
      setPointHistory([]);
    } catch (_error) {
    } finally {
      setLoading(false);
    }
  };

  const handleUsePoints = (option: PointUsageOption) => {
    if (!userPoints || userPoints.availablePoints < option.pointsRequired) {
      Alert.alert('포인트 부족', '사용 가능한 포인트가 부족합니다.');
      return;
    }

    Alert.alert(
      '포인트 사용',
      `${option.name}에 ${option.pointsRequired.toLocaleString()}P를 사용하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '사용하기',
          onPress: async () => {
            try {
              Alert.alert('성공', '포인트가 사용되었습니다!');
              loadPointsData(); // 포인트 정보 새로고침
            } catch (error) {
              Alert.alert('오류', '포인트 사용 중 오류가 발생했습니다.');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTransactionTypeText = (type: string) => {
    switch (type) {
      case 'earned': return '적립';
      case 'used': return '사용';
      case 'expired': return '만료';
      case 'bonus': return '보너스';
      default: return type;
    }
  };

  const renderOverview = () => (
    <View style={styles.tabContent}>
      <View style={styles.pointsCard}>
        <Text style={styles.pointsLabel}>보유 포인트</Text>
        <Text style={styles.pointsAmount}>
          {userPoints?.availablePoints?.toLocaleString() || '0'}P
        </Text>
        <View style={styles.pointsDetails}>
          <View style={styles.pointDetail}>
            <Text style={styles.pointDetailLabel}>총 적립</Text>
            <Text style={styles.pointDetailValue}>
              {userPoints?.totalPoints?.toLocaleString() || '0'}P
            </Text>
          </View>
          <View style={styles.pointDetail}>
            <Text style={styles.pointDetailLabel}>사용</Text>
            <Text style={styles.pointDetailValue}>
              {userPoints?.usedPoints?.toLocaleString() || '0'}P
            </Text>
          </View>
          <View style={styles.pointDetail}>
            <Text style={styles.pointDetailLabel}>만료</Text>
            <Text style={styles.pointDetailValue}>
              {userPoints?.expiredPoints?.toLocaleString() || '0'}P
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.howToEarnSection}>
        <Text style={styles.sectionTitle}>포인트 적립 방법</Text>
        <View style={styles.earnMethod}>
          <Text style={styles.earnMethodIcon}>✨</Text>
          <View style={styles.earnMethodInfo}>
            <Text style={styles.earnMethodTitle}>예약 이용</Text>
            <Text style={styles.earnMethodDesc}>후기 미작성시 보증금의 100%를 포인트로 전환</Text>
          </View>
        </View>
        <View style={styles.earnMethod}>
          <Text style={styles.earnMethodIcon}>🎁</Text>
          <View style={styles.earnMethodInfo}>
            <Text style={styles.earnMethodTitle}>노쇼자 분배</Text>
            <Text style={styles.earnMethodDesc}>노쇼자의 보증금을 참석자에게 분배</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderUsage = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>포인트 사용</Text>
      {usageOptions.map((option) => (
        <TouchableOpacity
          key={option.id}
          style={[
            styles.usageOption,
            userPoints && userPoints.availablePoints < option.pointsRequired && styles.usageOptionDisabled,
          ]}
          onPress={() => handleUsePoints(option)}
          disabled={!userPoints || userPoints.availablePoints < option.pointsRequired}
        >
          <View style={styles.usageOptionLeft}>
            <View style={styles.usageOptionIcon}>
              <Text style={styles.usageOptionIconText}>
                {option.category === 'meetup' ? '🍽️' : '🎁'}
              </Text>
            </View>
            <View style={styles.usageOptionInfo}>
              <Text style={styles.usageOptionTitle}>{option.name}</Text>
              <Text style={styles.usageOptionDesc}>{option.description}</Text>
              <Text style={styles.usageOptionPoints}>
                {option.pointsRequired.toLocaleString()}P 필요
              </Text>
            </View>
          </View>
          <Icon
            name="chevron-right"
            size={20}
            color={userPoints && userPoints.availablePoints >= option.pointsRequired ? COLORS.text.secondary : COLORS.neutral.grey400}
          />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderHistory = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>포인트 내역</Text>
      {pointHistory.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>포인트 내역이 없습니다</Text>
        </View>
      ) : (
        pointHistory.map((transaction) => (
          <View key={transaction.id} style={styles.historyItem}>
            <View style={styles.historyItemLeft}>
              <Text style={styles.historyItemTitle}>{transaction.description}</Text>
              <Text style={styles.historyItemDate}>
                {formatDate(transaction.createdAt)}
              </Text>
            </View>
            <View style={styles.historyItemRight}>
              <Text style={[
                styles.historyItemAmount,
                transaction.type === 'earned' || transaction.type === 'bonus'
                  ? styles.historyItemAmountPositive
                  : styles.historyItemAmountNegative,
              ]}>
                {transaction.type === 'earned' || transaction.type === 'bonus' ? '+' : '-'}
                {transaction.amount.toLocaleString()}P
              </Text>
              <Text style={styles.historyItemType}>
                {getTransactionTypeText(transaction.type)}
              </Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <View style={styles.headerLeft} />
          <Text style={styles.title}>포인트</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Icon name="x" size={24} color={COLORS.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* 탭 */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
              개요
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'usage' && styles.activeTab]}
            onPress={() => setActiveTab('usage')}
          >
            <Text style={[styles.tabText, activeTab === 'usage' && styles.activeTabText]}>
              사용하기
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'history' && styles.activeTab]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
              내역
            </Text>
          </TouchableOpacity>
        </View>

        {/* 콘텐츠 */}
        <View style={styles.content}>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'usage' && renderUsage()}
          {activeTab === 'history' && renderHistory()}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  headerLeft: {
    width: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary.accent,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text.secondary,
  },
  activeTabText: {
    color: COLORS.primary.accent,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  pointsCard: {
    backgroundColor: COLORS.primary.main,
    borderRadius: 8,
    padding: 24,
    marginBottom: 24,
  },
  pointsLabel: {
    fontSize: 14,
    color: COLORS.neutral.white,
    opacity: 0.8,
    marginBottom: 8,
  },
  pointsAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.neutral.white,
    marginBottom: 16,
  },
  pointsDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pointDetail: {
    alignItems: 'center',
  },
  pointDetailLabel: {
    fontSize: 12,
    color: COLORS.neutral.white,
    opacity: 0.8,
    marginBottom: 4,
  },
  pointDetailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.neutral.white,
  },
  howToEarnSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  earnMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  earnMethodIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  earnMethodInfo: {
    flex: 1,
  },
  earnMethodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  earnMethodDesc: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  usageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.neutral.white,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    borderRadius: 8,
    marginBottom: 12,
  },
  usageOptionDisabled: {
    opacity: 0.5,
  },
  usageOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  usageOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.neutral.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  usageOptionIconText: {
    fontSize: 20,
  },
  usageOptionInfo: {
    flex: 1,
  },
  usageOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  usageOptionDesc: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  usageOptionPoints: {
    fontSize: 12,
    color: COLORS.primary.accent,
    fontWeight: '500',
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  historyItemLeft: {
    flex: 1,
  },
  historyItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  historyItemDate: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  historyItemRight: {
    alignItems: 'flex-end',
  },
  historyItemAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  historyItemAmountPositive: {
    color: COLORS.functional.success,
  },
  historyItemAmountNegative: {
    color: COLORS.functional.error,
  },
  historyItemType: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
});

export default PointsModal;