// 약속금 시스템 타입 정의

export interface DepositPolicy {
  id: string;
  name: string;
  amount: number;
  description: string;
  isDefault: boolean;
}

export interface UserDeposit {
  id: string;
  userId: string;
  meetupId: string;
  amount: number;
  status: DepositStatus;
  paymentMethod: PaymentMethod;
  paymentId?: string;
  paidAt?: string;
  refundedAt?: string;
  refundAmount?: number;
  refundReason?: RefundReason;
  createdAt: string;
  updatedAt: string;
}

export interface DepositTransaction {
  id: string;
  depositId: string;
  type: TransactionType;
  amount: number;
  description: string;
  createdAt: string;
}

export interface UserPoints {
  id: string;
  userId: string;
  totalPoints: number;
  availablePoints: number;
  usedPoints: number;
  expiredPoints: number;
  lastUpdatedAt: string;
}

export interface PointTransaction {
  id: string;
  userId: string;
  type: PointTransactionType;
  amount: number;
  description: string;
  expiryDate?: string;
  relatedDepositId?: string;
  createdAt: string;
}

export type DepositStatus = 
  | 'pending'     // 결제 대기
  | 'paid'        // 결제 완료
  | 'refunded'    // 환불 완료
  | 'converted'   // 포인트 전환
  | 'forfeited'   // 몰수 (노쇼)
  | 'failed';     // 결제 실패

export type PaymentMethod = 
  | 'card'        // 카드
  | 'kakaopay'    // 카카오페이
  | 'points';     // 포인트

export type RefundReason = 
  | 'normal_attendance'      // 정상 참석
  | 'meetup_cancelled'       // 모임 취소
  | 'user_cancelled'         // 사용자 취소
  | 'system_error'           // 시스템 오류
  | 'admin_decision';        // 관리자 판단

export type TransactionType = 
  | 'payment'     // 결제
  | 'refund'      // 환불
  | 'conversion'; // 포인트 전환

export type PointTransactionType = 
  | 'earned'      // 적립
  | 'used'        // 사용
  | 'expired'     // 만료
  | 'bonus';      // 보너스

export interface DepositRefundPolicy {
  // 환불 정책
  normalAttendanceWithReview: {
    refundRate: number; // 100%
    autoRefundHours: number; // 24시간
  };
  normalAttendanceWithoutReview: {
    pointConversionDays: number; // 2일
    pointConversionRate: number; // 100%
  };
  noShow: {
    refundRate: number; // 0%
    redistributeToAttendees: boolean; // true
  };
  cancellation: {
    // 취소 시간대별 환불 정책
    beforeHours: Array<{
      hours: number;
      refundRate: number;
    }>;
  };
}

export interface PointUsageOption {
  id: string;
  name: string;
  description: string;
  pointsRequired: number;
  category: 'meetup' | 'gift' | 'discount';
  isActive: boolean;
  imageUrl?: string;
}

// 결제 관련 인터페이스
export interface PaymentRequest {
  amount: number;
  userId: string;
  meetupId: string;
  paymentMethod: PaymentMethod;
  cardId?: string; // 등록된 카드 ID
}

export interface PaymentResponse {
  success: boolean;
  paymentId?: string;
  errorMessage?: string;
  redirectUrl?: string; // 카카오페이 등의 경우
}

export interface RefundRequest {
  depositId: string;
  amount: number;
  reason: RefundReason;
  adminNote?: string;
}

export interface DepositStats {
  totalDeposits: number;
  totalRefunds: number;
  totalForfeited: number;
  totalPointsConverted: number;
  noShowRate: number;
  attendanceRate: number;
  reviewWriteRate: number;
}