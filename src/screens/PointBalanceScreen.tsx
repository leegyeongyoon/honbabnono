import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SHADOWS } from '../styles/colors';
import { Icon } from '../components/Icon';
import apiClient from '../services/apiClient';
import userApiService from '../services/userApiService';

interface PointTransaction {
  id: string;
  type: 'earn' | 'spend' | 'charge' | 'refund' | 'used';
  amount: number;
  description: string;
  createdAt: string;
  relatedDepositId?: string;
}

const PointBalanceScreen: React.FC = () => {
  const navigation = useNavigation();
  const [currentPoints, setCurrentPoints] = useState(0);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPointData();
  }, []);

  const fetchPointData = async () => {
    try {
      console.log('💰 포인트 데이터 조회 시작');

      // 현재 포인트 잔액 가져오기
      const userStats = await userApiService.getUserStats();
      setCurrentPoints(userStats.availablePoints || 0);

      // 포인트 내역 가져오기
      const response = await apiClient.get('/user/point-transactions', {
        params: { page: 1, limit: 50 }
      });

      if (response.data.success && response.data.data) {
        setTransactions(response.data.data);
        console.log('✅ 포인트 내역 조회 성공:', response.data.data.length, '건');
      } else {
        console.error('❌ 포인트 내역 조회 실패:', response.data.message || 'Unknown error');
        // 에러시 빈 배열로 설정
        setTransactions([]);
      }
    } catch (error) {
      console.error('❌ 포인트 데이터 조회 실패:', error);
      // 에러시 빈 배열로 설정
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earn':
        return <Icon name="plus" size={18} color="#FFFFFF" />;
      case 'spend':
      case 'used':
        return <Icon name="minus" size={18} color="#FFFFFF" />;
      case 'charge':
        return <Icon name="credit-card" size={18} color="#FFFFFF" />;
      case 'refund':
        return <Icon name="gift" size={18} color="#FFFFFF" />;
      default:
        return <Icon name="plus" size={18} color="#FFFFFF" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'earn':
        return '#2ECC71';
      case 'spend':
      case 'used':
        return '#E74C3C';
      case 'charge':
        return '#3498DB';
      case 'refund':
        return '#F39C12';
      default:
        return '#95A5A6';
    }
  };

  const getTransactionBackgroundColor = (type: string) => {
    switch (type) {
      case 'earn':
        return '#2ECC71';
      case 'spend':
      case 'used':
        return '#E74C3C';
      case 'charge':
        return '#3498DB';
      case 'refund':
        return '#F39C12';
      default:
        return '#95A5A6';
    }
  };

  const getTransactionTitle = (description: string, type: string) => {
    switch (type) {
      case 'earn':
        return '포인트 적립';
      case 'spend':
      case 'used':
        return '포인트 사용';
      case 'charge':
        return '포인트 충전';
      case 'refund':
        return '포인트 환불';
      default:
        return '포인트 거래';
    }
  };

  const formatDescription = (description: string) => {
    // 모임 ID를 모임 이름으로 변환하는 로직
    if (description.includes('모임 ID:')) {
      // 실제로는 모임 ID를 통해 모임 이름을 조회해야 하지만, 
      // 지금은 간단하게 처리
      const meetupIdMatch = description.match(/모임 ID: ([^)]+)/);
      if (meetupIdMatch) {
        return description.replace(/모임 ID: [^)]+/, '모임 약속금 결제');
      }
    }
    
    // 기타 설명 간소화
    if (description.includes('포인트 충전')) {
      return '카드/계좌이체';
    }
    if (description.includes('개발자 계정 보너스')) {
      return '개발자 보너스';
    }
    if (description.includes('관리자 포인트')) {
      return '관리자 충전';
    }
    
    return description;
  };

  const formatAmount = (amount: number) => {
    const sign = amount > 0 ? '+' : '';
    return `${sign}${amount.toLocaleString()}P`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.loadingText}>로딩 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>포인트</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 현재 포인트 */}
        <View style={styles.pointCard}>
          <Text style={styles.pointLabel}>보유 포인트</Text>
          <Text style={styles.pointAmount}>{currentPoints.toLocaleString()}P</Text>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.chargeButton}
              onPress={() => navigation.navigate('PointCharge')}
            >
              <Text style={styles.chargeButtonText}>충전하기</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 포인트 내역 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>포인트 내역</Text>
          
          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>💸</Text>
              <Text style={styles.emptyStateText}>포인트 내역이 없습니다</Text>
              <Text style={styles.emptyStateSubtext}>포인트를 충전하거나 모임에 참여해보세요!</Text>
            </View>
          ) : (
            transactions.map(transaction => (
              <View key={transaction.id} style={styles.transactionCard}>
                <View style={styles.transactionMain}>
                  <View style={[
                    styles.transactionIconContainer,
                    { backgroundColor: getTransactionBackgroundColor(transaction.type) }
                  ]}>
                    {getTransactionIcon(transaction.type)}
                  </View>
                  
                  <View style={styles.transactionContent}>
                    <View style={styles.transactionHeader}>
                      <Text style={styles.transactionTitle}>
                        {getTransactionTitle(transaction.description, transaction.type)}
                      </Text>
                      <Text style={[
                        styles.transactionAmount,
                        { color: getTransactionColor(transaction.type) }
                      ]}>
                        {formatAmount(transaction.type === 'used' ? -transaction.amount : transaction.amount)}
                      </Text>
                    </View>
                    
                    <View style={styles.transactionFooter}>
                      <Text style={styles.transactionDescription}>
                        {formatDescription(transaction.description)}
                      </Text>
                      <Text style={styles.transactionDate}>
                        {formatDate(transaction.createdAt)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.bottomSpacing} />
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
  
  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  placeholder: {
    width: 40,
  },
  
  // 컨텐츠
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  
  // 포인트 카드
  pointCard: {
    backgroundColor: COLORS.primary.main,
    borderRadius: 16,
    padding: 24,
    marginTop: 20,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  pointLabel: {
    fontSize: 16,
    color: COLORS.neutral.white,
    marginBottom: 8,
  },
  pointAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.neutral.white,
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  chargeButton: {
    backgroundColor: COLORS.neutral.white,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  chargeButtonText: {
    color: COLORS.primary.main,
    fontWeight: '600',
    fontSize: 14,
  },
  
  // 섹션
  section: {
    marginTop: 30,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  
  // 거래 내역
  transactionCard: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 16,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  transactionMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  transactionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  transactionContent: {
    flex: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  transactionAmount: {
    fontSize: 17,
    fontWeight: '700',
  },
  transactionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  transactionDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
    flex: 1,
  },
  transactionDate: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginLeft: 12,
  },
  
  // 빈 상태
  emptyState: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.text.primary,
    marginBottom: 8,
    fontWeight: '500',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  
  bottomSpacing: {
    height: 40,
  },
});

export default PointBalanceScreen;