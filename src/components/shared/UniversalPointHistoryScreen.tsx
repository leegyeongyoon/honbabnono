import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { COLORS, SHADOWS } from '../../styles/colors';
import { Icon } from '../Icon';
import userApiService from '../../services/userApiService';

interface NavigationAdapter {
  navigate: (screen: string, params?: any) => void;
  goBack: () => void;
}

interface PointTransaction {
  id: string;
  type: 'earned' | 'spent' | 'refunded';
  amount: number;
  description: string;
  created_at: string;
  meetup_id?: string;
}

const UniversalPointHistoryScreen: React.FC<{navigation: NavigationAdapter, user?: any}> = ({ navigation, user }) => {
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [currentPoints, setCurrentPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPointHistory = useCallback(async () => {
    try {
      setError(null);

      // 현재 포인트 조회
      const pointsResponse = await userApiService.getPoints();
      setCurrentPoints(pointsResponse.data?.points || pointsResponse.points || 0);

      // 포인트 거래 내역 조회
      const historyResponse = await userApiService.getPointHistory();
      setTransactions(historyResponse.data || historyResponse.transactions || []);
    } catch (_error) {
      setError('포인트 내역을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchPointHistory(); }, [fetchPointHistory]);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earned': return 'plus-circle';
      case 'spent': return 'minus-circle';
      case 'refunded': return 'rotate-ccw';
      default: return 'circle';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'earned': return COLORS.functional.success;
      case 'spent': return COLORS.functional.error;
      case 'refunded': return COLORS.primary.accent;
      default: return COLORS.text.secondary;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.placeholder} />
          <Text style={styles.headerTitle}>포인트 내역</Text>
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
        <Text style={styles.headerTitle}>포인트 내역</Text>
        <TouchableOpacity onPress={() => navigation.navigate('PointCharge')}>
          <Icon name="plus" size={24} color={COLORS.primary.accent} />
        </TouchableOpacity>
      </View>

      <View style={styles.pointsCard}>
        <Text style={styles.pointsLabel}>보유 포인트</Text>
        <Text style={styles.pointsAmount}>{currentPoints.toLocaleString()}P</Text>
        <TouchableOpacity
          style={styles.chargeButton}
          onPress={() => navigation.navigate('PointCharge')}
        >
          <Text style={styles.chargeButtonText}>충전하기</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchPointHistory();}} tintColor={COLORS.primary.accent} colors={[COLORS.primary.accent]} />}
      >
        {error ? (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle" size={48} color={COLORS.functional.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchPointHistory}>
              <Text style={styles.retryButtonText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        ) : transactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="coins" size={48} color={COLORS.text.tertiary} />
            <Text style={styles.emptyText}>포인트 내역이 없습니다</Text>
            <Text style={styles.emptySubtext}>약속에 참여하면 포인트를 받을 수 있어요!</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {transactions.map(transaction => (
              <TouchableOpacity
                key={transaction.id}
                style={styles.transactionItem}
                onPress={() => transaction.meetup_id && navigation.navigate('MeetupDetail', { meetupId: transaction.meetup_id })}
                disabled={!transaction.meetup_id}
              >
                <View style={[styles.transactionIcon, { backgroundColor: getTransactionColor(transaction.type) + '12' }]}>
                  <Icon name={getTransactionIcon(transaction.type)} size={20} color={getTransactionColor(transaction.type)} />
                </View>
                <View style={styles.transactionContent}>
                  <Text style={styles.transactionDescription}>{transaction.description}</Text>
                  <Text style={styles.transactionDate}>
                    {new Date(transaction.created_at).toLocaleDateString('ko-KR')}
                  </Text>
                </View>
                <Text style={[styles.transactionAmount, { color: getTransactionColor(transaction.type) }]}>
                  {transaction.type === 'earned' || transaction.type === 'refunded' ? '+' : '-'}{transaction.amount.toLocaleString()}P
                </Text>
              </TouchableOpacity>
            ))}
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
  pointsCard: {
    backgroundColor: COLORS.primary.main,
    margin: 16,
    padding: 24,
    borderRadius: 8,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  pointsLabel: {
    fontSize: 13,
    color: COLORS.neutral.white,
    opacity: 0.7,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  pointsAmount: {
    fontSize: 34,
    fontWeight: '700',
    color: COLORS.neutral.white,
    marginVertical: 8,
    letterSpacing: -0.5,
  },
  chargeButton: {
    backgroundColor: COLORS.neutral.white,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 6,
  },
  chargeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary.main,
  },
  content: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.white,
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.06)',
    ...SHADOWS.small,
  },
  transactionIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionContent: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    letterSpacing: -0.1,
  },
  transactionDate: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    marginTop: 3,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: 16,
    letterSpacing: -0.2,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 15,
    color: COLORS.text.secondary,
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.neutral.white,
  },
});

export default UniversalPointHistoryScreen;
