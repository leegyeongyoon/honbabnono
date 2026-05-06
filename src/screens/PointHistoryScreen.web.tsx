import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigate } from 'react-router-dom';
import { COLORS, SHADOWS, CSS_SHADOWS, CARD_STYLE } from '../styles/colors';
import { HEADER_STYLE } from '../styles/spacing';
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

type FilterType = 'all' | 'earn' | 'use';

const PointHistoryScreen: React.FC = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentPoints, setCurrentPoints] = useState(0);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

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
      case 'charge': return COLORS.functional.success;
      case 'use': return COLORS.functional.error;
      case 'refund': return COLORS.functional.success;
      case 'reward': return COLORS.functional.success;
      default: return COLORS.text.secondary;
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

  const isPositiveTransaction = (type: string): boolean => {
    return type === 'charge' || type === 'refund' || type === 'reward';
  };

  const filteredTransactions = transactions.filter((t) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'earn') return isPositiveTransaction(t.type);
    if (activeFilter === 'use') return t.type === 'use';
    return true;
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${month}.${day}`;
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const computeRunningBalance = (txList: PointTransaction[]): number[] => {
    // Compute balance after each transaction, starting from currentPoints
    // Transactions are newest-first, so go backward
    const balances: number[] = new Array(txList.length);
    let bal = currentPoints;
    for (let i = 0; i < txList.length; i++) {
      balances[i] = bal;
      const tx = txList[i];
      // Reverse the effect of this transaction to get previous balance
      if (tx.type === 'use') {
        bal = bal + tx.amount;
      } else {
        bal = bal - tx.amount;
      }
    }
    return balances;
  };

  const balances = computeRunningBalance(filteredTransactions);

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'earn', label: '적립' },
    { key: 'use', label: '사용' },
  ];

  const renderHeader = () => (
    <div style={headerStyles.container}>
      <div
        style={headerStyles.backButton}
        onClick={() => navigate('/mypage')}
        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '0.6'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '1'; }}
      >
        <Icon name="chevron-left" size={24} color="#121212" />
      </div>
      <span style={headerStyles.title}>포인트</span>
      <div style={headerStyles.rightSpacer} />
    </div>
  );

  const renderFilterTabs = () => (
    <div style={filterStyles.container}>
      {filters.map((f) => {
        const isActive = activeFilter === f.key;
        return (
          <div
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            onMouseEnter={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLDivElement).style.backgroundColor = '#f5f5f5';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
              }
            }}
            style={{
              ...filterStyles.pill,
              ...(isActive ? filterStyles.pillActive : filterStyles.pillInactive),
              cursor: 'pointer',
              transition: 'all 200ms ease',
            }}
          >
            <span
              style={{
                ...filterStyles.pillText,
                ...(isActive ? filterStyles.pillTextActive : filterStyles.pillTextInactive),
              }}
            >
              {f.label}
            </span>
          </div>
        );
      })}
    </div>
  );

  const renderPointCard = () => (
    <div style={cardStyles.wrapper}>
      <div style={cardStyles.card}>
        <span style={cardStyles.label}>보유포인트</span>
        <span style={cardStyles.amount}>{currentPoints.toLocaleString()}P</span>
        <div style={cardStyles.buttonRow}>
          <div
            style={cardStyles.actionButton}
            onClick={() => navigate('/point-charge')}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(255,255,255,0.30)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(255,255,255,0.18)'; }}
          >
            <span style={cardStyles.actionIcon}>&#8853;</span>
            <span style={cardStyles.actionText}>충전</span>
          </div>
          <div
            style={cardStyles.actionButton}
            onClick={() => alert('포인트 인출 기능은 준비 중입니다.')}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(255,255,255,0.30)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(255,255,255,0.18)'; }}
          >
            <span style={cardStyles.actionIcon}>&#8854;</span>
            <span style={cardStyles.actionText}>인출</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTransactionItem = (transaction: PointTransaction, index: number) => {
    const positive = isPositiveTransaction(transaction.type);
    const amountColor = positive ? '#FFA529' : '#121212';
    const amountPrefix = positive ? '+' : '-';
    const balance = balances[index] ?? 0;

    return (
      <div key={transaction.id}>
        <div style={listStyles.row}>
          {/* Left: date + time */}
          <div style={listStyles.dateCol}>
            <span style={listStyles.date}>{formatDate(transaction.created_at)}</span>
            <span style={listStyles.time}>{formatTime(transaction.created_at)}</span>
          </div>

          {/* Center: type text */}
          <div style={listStyles.typeCol}>
            <span style={listStyles.typeText}>{getTransactionTypeText(transaction.type)}</span>
          </div>

          {/* Right: amount + balance */}
          <div style={listStyles.amountCol}>
            <span style={{ ...listStyles.amountText, color: amountColor }}>
              {amountPrefix}{(transaction.amount ?? 0).toLocaleString()}P
            </span>
            <span style={listStyles.balanceText}>{balance.toLocaleString()}P</span>
          </div>
        </div>
        <div style={listStyles.separator} />
      </div>
    );
  };

  if (loading) {
    return (
      <div style={pageStyles.container}>
        {renderHeader()}
        <div style={{ padding: '8px 0', backgroundColor: '#FFFFFF' }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ padding: '0 20px' }}>
              <ListItemSkeleton key={i} size={44} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={pageStyles.container}>
        {renderHeader()}
        <ErrorState
          title="포인트 내역을 불러올 수 없습니다"
          description="네트워크 상태를 확인하고 다시 시도해주세요"
          onRetry={fetchPointHistory}
        />
      </div>
    );
  }

  return (
    <div style={pageStyles.container}>
      {renderHeader()}
      {renderFilterTabs()}
      {renderPointCard()}

      <div style={pageStyles.listArea}>
        {filteredTransactions.length === 0 ? (
          <EmptyState
            icon="dollar-sign"
            title="포인트 사용 내역이 없습니다"
            description="포인트를 충전하고 매장 예약에 사용해보세요!"
            actionLabel="포인트 충전하기"
            onAction={() => navigate('/point-charge')}
          />
        ) : (
          <div style={pageStyles.transactionList}>
            {filteredTransactions.map((tx, idx) => renderTransactionItem(tx, idx))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Inline style objects (CSS-in-JS for web) ─── */

const pageStyles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: '#FFFFFF',
  },
  listArea: {
    flex: 1,
    overflowY: 'auto',
  },
  transactionList: {
    paddingBottom: 24,
  },
};

const headerStyles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingLeft: 4,
    paddingRight: 4,
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #f1f2f3',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'opacity 200ms ease',
  },
  backArrow: {
    fontSize: 20,
    fontWeight: '400',
    color: '#121212',
    lineHeight: '1',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#121212',
    letterSpacing: -0.2,
  },
  rightSpacer: {
    width: 44,
    height: 44,
  },
};

const filterStyles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: '12px 20px',
    backgroundColor: '#FFFFFF',
  },
  pill: {
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 7,
    paddingBottom: 7,
    borderRadius: 20,
    userSelect: 'none',
  },
  pillActive: {
    backgroundColor: '#FFA529',
  },
  pillInactive: {
    backgroundColor: 'transparent',
    border: '1px solid #E0E0E0',
  },
  pillText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: '1.3',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  pillTextInactive: {
    color: '#121212',
  },
};

const cardStyles: Record<string, React.CSSProperties> = {
  wrapper: {
    padding: '8px 20px 16px 20px',
  },
  card: {
    background: 'linear-gradient(135deg, #FFA529, #E8941F)',
    borderRadius: 16,
    padding: '24px 24px 20px 24px',
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 4,
    fontWeight: '400',
  },
  amount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  buttonRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 16,
    paddingRight: 18,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'background-color 200ms ease',
  },
  actionIcon: {
    fontSize: 18,
    color: '#FFFFFF',
    lineHeight: '1',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
};

const listStyles: Record<string, React.CSSProperties> = {
  row: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    padding: '16px 20px',
  },
  dateCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    minWidth: 48,
    marginRight: 16,
  },
  date: {
    fontSize: 14,
    color: '#878b94',
    fontWeight: '400',
    lineHeight: '1.4',
  },
  time: {
    fontSize: 13,
    color: '#878b94',
    fontWeight: '400',
    lineHeight: '1.4',
  },
  typeCol: {
    flex: 1,
  },
  typeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#121212',
  },
  amountCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: '1.4',
  },
  balanceText: {
    fontSize: 14,
    color: '#878b94',
    fontWeight: '400',
    lineHeight: '1.4',
  },
  separator: {
    height: 1,
    backgroundColor: '#f1f2f3',
    marginLeft: 20,
    marginRight: 20,
  },
};

// Keep StyleSheet for compatibility with any RN components that might still need it
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});

export default PointHistoryScreen;
