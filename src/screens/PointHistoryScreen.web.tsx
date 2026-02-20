import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, SHADOWS, CARD_STYLE } from '../styles/colors';
import { Icon } from '../components/Icon';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { ListItemSkeleton } from '../components/skeleton';
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
  const [error, setError] = useState(false);
  const [currentPoints, setCurrentPoints] = useState(0);

  const fetchPointHistory = async () => {
    try {
      setLoading(true);
      setError(false);
      const response = await apiClient.get('/user/point-history');
      setTransactions(response.data.transactions || []);
      setCurrentPoints(response.data.currentPoints || 0);
    } catch (err) {
      setTransactions([]);
      setCurrentPoints(0);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
      case 'charge': return '#2E7D4F';
      case 'use': return '#D32F2F';
      case 'refund': return '#2E7D4F';
      case 'reward': return '#2E7D4F';
      default: return '#5C4F42';
    }
  };

  const getTransactionIconName = (type: string): string => {
    switch (type) {
      case 'charge': return 'dollar-sign';
      case 'use': return 'credit-card';
      case 'refund': return 'arrow-left';
      case 'reward': return 'gift';
      default: return 'dollar-sign';
    }
  };

  const renderTransactionItem = (transaction: PointTransaction) => (
    <div
      key={transaction.id}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(17,17,17,0.02)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
      style={{ cursor: 'pointer', transition: 'background-color 200ms ease' }}
    >
      <View style={styles.transactionItem}>
        <View style={styles.profileImage}>
          <View style={styles.avatarCircle}>
            <Icon name={getTransactionIconName(transaction.type)} size={20} color={getTransactionColor(transaction.type)} />
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
            {(transaction.amount ?? 0).toLocaleString()}원
          </Text>
          <Text style={styles.transactionType}>
            {getTransactionTypeText(transaction.type)}
          </Text>
        </View>
      </View>
    </div>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigate('/mypage')}
          >
            <Icon name="arrow-left" size={24} color="#1A1714" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>포인트 내역</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.skeletonWrap}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <ListItemSkeleton key={i} size={44} />
          ))}
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigate('/mypage')}
          >
            <Icon name="arrow-left" size={24} color="#1A1714" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>포인트 내역</Text>
          <View style={{ width: 28 }} />
        </View>
        <ErrorState
          title="포인트 내역을 불러올 수 없습니다"
          description="네트워크 상태를 확인하고 다시 시도해주세요"
          onRetry={fetchPointHistory}
        />
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
        <Text style={styles.headerTitle}>포인트 내역</Text>
        <TouchableOpacity
          style={styles.chargeButton}
          onPress={() => navigate('/point-charge')}
        >
          <Icon name="plus" size={20} color="#C49A70" />
        </TouchableOpacity>
      </View>

      {/* 현재 보유 포인트 */}
      <View style={styles.currentPointsContainer}>
        <div style={{
          background: 'linear-gradient(135deg, #9A7450 0%, #C49A70 100%)',
          borderRadius: 8,
          padding: 28,
          alignItems: 'center',
          textAlign: 'center',
          boxShadow: '0 4px 16px rgba(184,107,74,0.20)',
        }}>
          <Text style={styles.pointsLabel}>현재 보유 포인트</Text>
          <Text style={styles.pointsAmount}>{currentPoints.toLocaleString()}원</Text>
          <div
            onClick={() => navigate('/point-charge')}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.30)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'; }}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingLeft: 20,
              paddingRight: 20,
              paddingTop: 12,
              paddingBottom: 12,
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderRadius: 6,
              cursor: 'pointer',
              transition: 'all 200ms ease',
            }}
          >
            <Icon name="plus" size={16} color="#FFFFFF" />
            <Text style={styles.chargeButtonText}>포인트 충전</Text>
          </div>
        </div>
      </View>

      <ScrollView style={styles.content}>
        {transactions.length === 0 ? (
          <EmptyState
            icon="dollar-sign"
            title="포인트 사용 내역이 없습니다"
            description="포인트를 충전하고 약속에 참여해보세요!"
            actionLabel="포인트 충전하기"
            onAction={() => navigate('/point-charge')}
          />
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
    backgroundColor: '#EFECEA',
  },
  skeletonWrap: {
    paddingTop: 8,
    backgroundColor: COLORS.neutral.white,
    marginTop: 8,
    borderRadius: 8,
    marginHorizontal: 16,
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
  chargeButton: {
    padding: 4,
    cursor: 'pointer',
    transition: 'all 200ms ease',
  },
  currentPointsContainer: {
    padding: 20,
    paddingBottom: 8,
  },
  pointsCard: {
    backgroundColor: '#9A7450',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
  },
  pointsLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  pointsAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  chargeButtonFull: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    gap: 8,
  },
  chargeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  transactionsList: {
    backgroundColor: COLORS.neutral.white,
    marginTop: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.06)',
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1714',
    padding: 20,
    paddingBottom: 0,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.06)',
  },
  profileImage: {
    marginRight: 16,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F7F5F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1714',
    marginBottom: 4,
  },
  meetupTitle: {
    fontSize: 14,
    color: '#5C4F42',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 13,
    color: '#8B7E72',
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
    color: '#5C4F42',
  },
});

export default PointHistoryScreen;
