import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { COLORS, SHADOWS } from '../../styles/colors';
import { Icon } from '../Icon';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  const getApiUrl = () => process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  const fetchPointHistory = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${getApiUrl()}/user/points/history`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      setTransactions(data.transactions || []);
      setCurrentPoints(data.currentPoints || 0);
    } catch (error) {
      console.error('포인트 내역 조회 실패:', error);
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
      case 'refunded': return COLORS.primary.main;
      default: return COLORS.text.secondary;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>포인트 내역</Text>
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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>포인트 내역</Text>
        <TouchableOpacity onPress={() => navigation.navigate('PointCharge')}>
          <Icon name="plus" size={24} color={COLORS.primary.main} />
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchPointHistory();}} />}
      >
        {transactions.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 }}>
            <Icon name="coins" size={48} color={COLORS.text.tertiary} />
            <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.text.primary, marginTop: 16 }}>
              포인트 내역이 없습니다
            </Text>
          </View>
        ) : (
          <View style={{ padding: 16 }}>
            {transactions.map(transaction => (
              <TouchableOpacity
                key={transaction.id}
                style={styles.transactionItem}
                onPress={() => transaction.meetup_id && navigation.navigate('MeetupDetail', { meetupId: transaction.meetup_id })}
                disabled={!transaction.meetup_id}
              >
                <View style={[styles.transactionIcon, { backgroundColor: getTransactionColor(transaction.type) + '20' }]}>
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
  container: { flex: 1, backgroundColor: COLORS.neutral.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
    backgroundColor: COLORS.neutral.white, ...SHADOWS.small,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text.primary },
  pointsCard: {
    backgroundColor: COLORS.primary.main, margin: 16, padding: 20, borderRadius: 16, alignItems: 'center',
  },
  pointsLabel: { fontSize: 14, color: COLORS.neutral.white, opacity: 0.8 },
  pointsAmount: { fontSize: 32, fontWeight: '700', color: COLORS.neutral.white, marginVertical: 8 },
  chargeButton: { backgroundColor: COLORS.neutral.white, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  chargeButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.primary.main },
  content: { flex: 1 },
  transactionItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.neutral.white,
    borderRadius: 12, padding: 16, marginBottom: 8, ...SHADOWS.small,
  },
  transactionIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  transactionContent: { flex: 1 },
  transactionDescription: { fontSize: 14, fontWeight: '600', color: COLORS.text.primary },
  transactionDate: { fontSize: 12, color: COLORS.text.secondary, marginTop: 4 },
  transactionAmount: { fontSize: 16, fontWeight: '600' },
});

export default UniversalPointHistoryScreen;