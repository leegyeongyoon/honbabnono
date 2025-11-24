import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, SHADOWS } from '../styles/colors';
import { Icon } from '../components/Icon';
import apiClient from '../services/apiClient';

interface PointTransaction {
  id: string;
  type: 'charge' | 'use' | 'refund' | 'reward';
  amount: number;
  description: string;
  created_at: string;
  meetup_title?: string;
  status: 'completed' | 'pending' | 'cancelled';
}

const PointHistoryScreen: React.FC = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPoints, setCurrentPoints] = useState(0);

  useEffect(() => {
    const fetchPointHistory = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/user/point-history');
        setTransactions(response.data.transactions || []);
        setCurrentPoints(response.data.currentPoints || 0);
      } catch (error) {
        console.error('포인트 내역 조회 실패:', error);
        setTransactions([]);
        setCurrentPoints(0);
      } finally {
        setLoading(false);
      }
    };

    fetchPointHistory();
  }, []);

  const getTransactionTypeText = (type: string) => {
    switch (type) {
      case 'charge': return '충전';
      case 'use': return '사용';
      case 'refund': return '환불';
      case 'reward': return '적립';
      default: return type;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'charge': return COLORS.secondary.main;
      case 'use': return COLORS.text.error;
      case 'refund': return COLORS.primary.main;
      case 'reward': return COLORS.secondary.main;
      default: return COLORS.text.secondary;
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'charge': return '💰';
      case 'use': return '💸';
      case 'refund': return '💳';
      case 'reward': return '🎁';
      default: return '💰';
    }
  };

  const renderTransactionItem = (transaction: PointTransaction) => (
    <View key={transaction.id} style={styles.transactionItem}>
      <View style={styles.profileImage}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{getTransactionIcon(transaction.type)}</Text>
        </View>
      </View>

      <View style={styles.transactionInfo}>
        <Text style={styles.transactionDescription}>{transaction.description}</Text>
        {transaction.meetup_title && (
          <Text style={styles.meetupTitle}>{transaction.meetup_title}</Text>
        )}
        <Text style={styles.transactionDate}>
          {new Date(transaction.created_at).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      </View>

      <View style={styles.amountContainer}>
        <Text style={[
          styles.transactionAmount,
          { color: getTransactionColor(transaction.type) }
        ]}>
          {transaction.type === 'use' ? '-' : '+'}
          {transaction.amount.toLocaleString()}원
        </Text>
        <Text style={styles.transactionType}>
          {getTransactionTypeText(transaction.type)}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.loadingText}>포인트 내역을 불러오는 중...</Text>
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
        <Text style={styles.headerTitle}>포인트 내역</Text>
        <TouchableOpacity
          style={styles.chargeButton}
          onPress={() => navigate('/point-charge')}
        >
          <Icon name="plus" size={20} color={COLORS.primary.main} />
        </TouchableOpacity>
      </View>

      {/* 현재 보유 포인트 */}
      <View style={styles.currentPointsContainer}>
        <View style={styles.pointsCard}>
          <Text style={styles.pointsLabel}>현재 보유 포인트</Text>
          <Text style={styles.pointsAmount}>{currentPoints.toLocaleString()}원</Text>
          <TouchableOpacity
            style={styles.chargeButtonFull}
            onPress={() => navigate('/point-charge')}
          >
            <Icon name="plus" size={16} color={COLORS.text.white} />
            <Text style={styles.chargeButtonText}>포인트 충전</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="calendar" size={48} color={COLORS.text.secondary} />
            <Text style={styles.emptyTitle}>포인트 사용 내역이 없습니다</Text>
            <Text style={styles.emptyDescription}>
              포인트를 충전하고 모임에 참여해보세요!
            </Text>
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => navigate('/point-charge')}
            >
              <Text style={styles.exploreButtonText}>포인트 충전하기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.transactionsList}>
            <Text style={styles.sectionTitle}>사용 내역 ({transactions.length}건)</Text>
            {transactions.map(renderTransactionItem)}
          </View>
        )}
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
  chargeButton: {
    padding: 4,
  },
  currentPointsContainer: {
    padding: 20,
    paddingBottom: 8,
  },
  pointsCard: {
    backgroundColor: COLORS.primary.main,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  pointsLabel: {
    fontSize: 14,
    color: COLORS.text.white,
    marginBottom: 8,
  },
  pointsAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text.white,
    marginBottom: 16,
  },
  chargeButtonFull: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  chargeButtonText: {
    color: COLORS.text.white,
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  exploreButtonText: {
    color: COLORS.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
  transactionsList: {
    backgroundColor: COLORS.neutral.white,
    marginTop: 8,
    marginHorizontal: 16,
    borderRadius: 16,
    ...SHADOWS.small,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    padding: 20,
    paddingBottom: 0,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  profileImage: {
    marginRight: 16,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFE0B2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  meetupTitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  transactionType: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
});

export default PointHistoryScreen;