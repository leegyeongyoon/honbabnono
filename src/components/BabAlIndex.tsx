import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SHADOWS } from '../styles/colors';

interface BabAlIndexProps {
  score: number;
  maxScore?: number;
  showDetails?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const BabAlIndex: React.FC<BabAlIndexProps> = ({ 
  score, 
  maxScore = 100, 
  showDetails = false,
  size = 'medium' 
}) => {
  const percentage = Math.min((score / maxScore) * 100, 100);
  
  const getBabAlLevel = (score: number): { level: string; color: string; emoji: string } => {
    if (score >= 90) {return { level: '밥신', color: COLORS.primary.accent, emoji: '👑' };}
    if (score >= 80) {return { level: '밥마스터', color: COLORS.primary.dark, emoji: '🔥' };}
    if (score >= 70) {return { level: '밥프로', color: COLORS.primary.main, emoji: '⭐' };}
    if (score >= 60) {return { level: '밥러버', color: COLORS.secondary.main, emoji: '💚' };}
    if (score >= 50) {return { level: '밥친구', color: COLORS.secondary.light, emoji: '😊' };}
    if (score >= 30) {return { level: '밥초보', color: COLORS.primary.light, emoji: '🌱' };}
    return { level: '신입', color: COLORS.neutral.grey300, emoji: '👶' };
  };

  const { level, color, emoji } = getBabAlLevel(score);

  const getContainerStyle = () => {
    switch (size) {
      case 'small':
        return [styles.container, styles.containerSmall];
      case 'large':
        return [styles.container, styles.containerLarge];
      default:
        return styles.container;
    }
  };

  const getScoreStyle = () => {
    switch (size) {
      case 'small':
        return [styles.score, styles.scoreSmall];
      case 'large':
        return [styles.score, styles.scoreLarge];
      default:
        return styles.score;
    }
  };

  return (
    <View style={getContainerStyle()}>
      <View style={styles.header}>
        <Text style={styles.title}>🍚 밥알지수</Text>
        <View style={[styles.levelBadge, { backgroundColor: color }]}>
          <Text style={styles.levelEmoji}>{emoji}</Text>
          <Text style={styles.levelText}>{level}</Text>
        </View>
      </View>
      
      <View style={styles.scoreContainer}>
        <Text style={getScoreStyle()}>{score}</Text>
        <Text style={styles.maxScore}>/ {maxScore}</Text>
      </View>
      
      <View style={styles.progressBar}>
        <View style={styles.progressBackground}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${percentage}%`,
                backgroundColor: color
              }
            ]} 
          />
        </View>
        <Text style={styles.percentage}>{Math.round(percentage)}%</Text>
      </View>

      {showDetails && (
        <View style={styles.detailsContainer}>
          <Text style={styles.detailsTitle}>밥알지수 구성</Text>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>• 모임 참여</Text>
            <Text style={styles.detailValue}>+5점/회</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>• 모임 주최</Text>
            <Text style={styles.detailValue}>+10점/회</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>• 좋은 리뷰</Text>
            <Text style={styles.detailValue}>+3점/개</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>• 신뢰도</Text>
            <Text style={styles.detailValue}>+1~5점</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    padding: 16,
    ...SHADOWS.small,
  },
  containerSmall: {
    padding: 12,
  },
  containerLarge: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  levelEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  levelText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  score: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.primary.main,
  },
  scoreSmall: {
    fontSize: 24,
  },
  scoreLarge: {
    fontSize: 48,
  },
  maxScore: {
    fontSize: 18,
    color: COLORS.text.secondary,
    marginLeft: 4,
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBackground: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.neutral.grey200,
    borderRadius: 4,
    marginRight: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    transition: 'width 0.3s ease',
  },
  percentage: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '600',
    minWidth: 35,
    textAlign: 'right',
  },
  detailsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral.grey200,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  detailValue: {
    fontSize: 12,
    color: COLORS.primary.main,
    fontWeight: '500',
  },
});

export default BabAlIndex;