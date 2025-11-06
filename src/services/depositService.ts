import {
  DepositPolicy,
  UserDeposit,
  DepositStatus,
  RefundReason,
  DepositRefundPolicy,
  PaymentRequest,
  PaymentResponse,
  RefundRequest,
  PointUsageOption,
  UserPoints,
  PointTransaction,
  DepositStats
} from '../types/deposit';

class DepositService {
  private readonly DEFAULT_DEPOSIT_AMOUNT = 2000;

  // 기본 약속금 정책
  private readonly refundPolicy: DepositRefundPolicy = {
    normalAttendanceWithReview: {
      refundRate: 1.0, // 100%
      autoRefundHours: 24
    },
    normalAttendanceWithoutReview: {
      pointConversionDays: 2,
      pointConversionRate: 1.0 // 100%
    },
    noShow: {
      refundRate: 0.0, // 0%
      redistributeToAttendees: true
    },
    cancellation: {
      beforeHours: [
        { hours: 1, refundRate: 1.0 },   // 1시간 전: 100%
        { hours: 0.67, refundRate: 0.6 }, // 40분 전: 60%
        { hours: 0.33, refundRate: 0.3 }, // 20분 전: 30%
        { hours: 0.17, refundRate: 0.0 }  // 10분 전: 0%
      ]
    }
  };

  /**
   * 기본 약속금 정책 가져오기
   */
  getDefaultDepositPolicy(): DepositPolicy {
    return {
      id: 'default',
      name: '기본 약속금',
      amount: this.DEFAULT_DEPOSIT_AMOUNT,
      description: '노쇼 방지 및 신뢰도 향상을 위한 약속금입니다.',
      isDefault: true
    };
  }

  /**
   * 약속금 결제 처리
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${apiUrl}/deposits/payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          errorMessage: result.error || '결제 처리 중 오류가 발생했습니다.'
        };
      }

      return {
        success: true,
        paymentId: result.paymentId,
        redirectUrl: result.redirectUrl
      };
    } catch (error) {
      console.error('결제 처리 실패:', error);
      return {
        success: false,
        errorMessage: error.message || '결제 처리 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 카카오페이 결제 처리 (준비 단계)
   */
  private async processKakaoPayment(request: PaymentRequest): Promise<PaymentResponse> {
    // 카카오페이 API 연동 예정
    // 현재는 Mock 응답
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          paymentId: `kakao_${Date.now()}`,
          redirectUrl: `https://mockup-kakaopay.com/pay?amount=${request.amount}`
        });
      }, 1000);
    });
  }

  /**
   * 카드 결제 처리 (준비 단계)
   */
  private async processCardPayment(request: PaymentRequest): Promise<PaymentResponse> {
    // 카드 결제 API 연동 예정 (예: 이니시스, KG이니시스 등)
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          paymentId: `card_${Date.now()}`
        });
      }, 1500);
    });
  }

  /**
   * 포인트 결제 처리
   */
  private async processPointsPayment(request: PaymentRequest): Promise<PaymentResponse> {
    // 사용자 포인트 확인 및 차감
    const userPoints = await this.getUserPoints(request.userId);
    
    if (userPoints.availablePoints < request.amount) {
      return {
        success: false,
        errorMessage: '보유 포인트가 부족합니다.'
      };
    }

    // 포인트 차감 처리
    await this.deductPoints(request.userId, request.amount, `모임 약속금 결제 (모임 ID: ${request.meetupId})`);

    return {
      success: true,
      paymentId: `points_${Date.now()}`
    };
  }

  /**
   * 환불 정책에 따른 환불 금액 계산
   */
  calculateRefundAmount(
    deposit: UserDeposit,
    scenario: 'normal_attendance_with_review' | 'normal_attendance_without_review' | 'no_show' | 'cancellation',
    hoursBeforeMeetup?: number
  ): { refundAmount: number; reason: RefundReason } {
    switch (scenario) {
      case 'normal_attendance_with_review':
        return {
          refundAmount: deposit.amount * this.refundPolicy.normalAttendanceWithReview.refundRate,
          reason: 'normal_attendance'
        };

      case 'normal_attendance_without_review':
        // 포인트로 전환 (환불 금액은 0)
        return {
          refundAmount: 0,
          reason: 'normal_attendance'
        };

      case 'no_show':
        return {
          refundAmount: deposit.amount * this.refundPolicy.noShow.refundRate,
          reason: 'normal_attendance'
        };

      case 'cancellation':
        if (hoursBeforeMeetup === undefined) {
          throw new Error('취소 시에는 모임 전 시간을 명시해야 합니다.');
        }

        const applicablePolicy = this.refundPolicy.cancellation.beforeHours
          .find(policy => hoursBeforeMeetup >= policy.hours) || 
          this.refundPolicy.cancellation.beforeHours[this.refundPolicy.cancellation.beforeHours.length - 1];

        return {
          refundAmount: deposit.amount * applicablePolicy.refundRate,
          reason: 'user_cancelled'
        };

      default:
        throw new Error('알 수 없는 환불 시나리오입니다.');
    }
  }

  /**
   * 자동 환불 처리
   */
  async processAutoRefund(depositId: string): Promise<boolean> {
    try {
      // 약속금 정보 조회
      const deposit = await this.getDepositById(depositId);
      if (!deposit) {
        throw new Error('약속금 정보를 찾을 수 없습니다.');
      }

      // 환불 금액 계산
      const { refundAmount } = this.calculateRefundAmount(deposit, 'normal_attendance_with_review');

      // 환불 처리
      await this.processRefund({
        depositId,
        amount: refundAmount,
        reason: 'normal_attendance'
      });

      return true;
    } catch (error) {
      console.error('자동 환불 처리 실패:', error);
      return false;
    }
  }

  /**
   * 포인트 전환 처리
   */
  async convertToPoints(depositId: string): Promise<boolean> {
    try {
      const deposit = await this.getDepositById(depositId);
      if (!deposit) {
        throw new Error('약속금 정보를 찾을 수 없습니다.');
      }

      // 포인트 적립
      const pointAmount = deposit.amount * this.refundPolicy.normalAttendanceWithoutReview.pointConversionRate;
      await this.addPoints(
        deposit.userId, 
        pointAmount, 
        `약속금 포인트 전환 (모임 ID: ${deposit.meetupId})`,
        deposit.id
      );

      // 약속금 상태 업데이트
      await this.updateDepositStatus(depositId, 'converted');

      return true;
    } catch (error) {
      console.error('포인트 전환 처리 실패:', error);
      return false;
    }
  }

  /**
   * 노쇼 페널티 처리 및 참석자에게 포인트 분배
   */
  async processNoShowPenalty(meetupId: string, noShowUserIds: string[], attendeeUserIds: string[]): Promise<boolean> {
    try {
      if (attendeeUserIds.length === 0) {
        console.warn('참석자가 없어 포인트 분배를 건너뜁니다.');
        return true;
      }

      let totalForfeitedAmount = 0;

      // 노쇼 사용자의 약속금 몰수 처리
      for (const userId of noShowUserIds) {
        const deposit = await this.getDepositByMeetupAndUser(meetupId, userId);
        if (deposit && deposit.status === 'paid') {
          await this.updateDepositStatus(deposit.id, 'forfeited');
          totalForfeitedAmount += deposit.amount;
        }
      }

      // 참석자에게 포인트 분배
      if (totalForfeitedAmount > 0) {
        const pointsPerAttendee = Math.floor(totalForfeitedAmount / attendeeUserIds.length);
        
        for (const userId of attendeeUserIds) {
          await this.addPoints(
            userId,
            pointsPerAttendee,
            `노쇼자 약속금 분배 (모임 ID: ${meetupId})`
          );
        }
      }

      return true;
    } catch (error) {
      console.error('노쇼 페널티 처리 실패:', error);
      return false;
    }
  }

  /**
   * 환불 처리
   */
  async processRefund(request: RefundRequest): Promise<boolean> {
    try {
      const deposit = await this.getDepositById(request.depositId);
      if (!deposit) {
        throw new Error('약속금 정보를 찾을 수 없습니다.');
      }

      // 실제 환불 처리 (결제 게이트웨이별)
      const success = await this.executeRefund(deposit, request.amount);
      
      if (success) {
        await this.updateDepositStatus(request.depositId, 'refunded');
        return true;
      }

      return false;
    } catch (error) {
      console.error('환불 처리 실패:', error);
      return false;
    }
  }

  /**
   * 포인트 사용 옵션 가져오기
   */
  getPointUsageOptions(): PointUsageOption[] {
    return [
      {
        id: 'deposit_payment',
        name: '약속금 대체 결제',
        description: '다음 모임 참여 시 약속금으로 사용',
        pointsRequired: 2000,
        category: 'meetup',
        isActive: true
      },
      {
        id: 'coffee_gift',
        name: '커피 기프티콘',
        description: '스타벅스/이디야 아메리카노',
        pointsRequired: 5000,
        category: 'gift',
        isActive: true,
        imageUrl: '/images/coffee-gift.png'
      },
      {
        id: 'chicken_gift',
        name: '치킨 기프티콘',
        description: 'BBQ/교촌/BHC 치킨 할인쿠폰',
        pointsRequired: 8000,
        category: 'gift',
        isActive: true,
        imageUrl: '/images/chicken-gift.png'
      },
      {
        id: 'meal_payment',
        name: '밥값 결제',
        description: '모임에서 식비 지불 시 사용',
        pointsRequired: 10000,
        category: 'meetup',
        isActive: false // MVP 이후
      }
    ];
  }

  /**
   * 약속금 통계 조회
   */
  async getDepositStats(period?: { startDate: string; endDate: string }): Promise<DepositStats> {
    // 실제 구현에서는 데이터베이스 쿼리
    return {
      totalDeposits: 15420000, // 총 약속금 금액
      totalRefunds: 12336000,  // 총 환불 금액
      totalForfeited: 924000,  // 총 몰수 금액
      totalPointsConverted: 2160000, // 총 포인트 전환 금액
      noShowRate: 0.06,        // 6% 노쇼율
      attendanceRate: 0.94,    // 94% 참석률
      reviewWriteRate: 0.78    // 78% 후기 작성률
    };
  }

  // Private helper methods
  private async getDepositById(depositId: string): Promise<UserDeposit | null> {
    // 데이터베이스에서 약속금 정보 조회
    // Mock 데이터 반환
    return null;
  }

  private async getDepositByMeetupAndUser(meetupId: string, userId: string): Promise<UserDeposit | null> {
    // 데이터베이스에서 특정 모임의 사용자 약속금 조회
    return null;
  }

  private async updateDepositStatus(depositId: string, status: DepositStatus): Promise<void> {
    // 데이터베이스 업데이트
    console.log(`약속금 ${depositId} 상태를 ${status}로 업데이트`);
  }

  private async executeRefund(deposit: UserDeposit, amount: number): Promise<boolean> {
    // 실제 환불 처리 (결제 게이트웨이별)
    console.log(`${deposit.paymentMethod}로 ${amount}원 환불 처리`);
    return true;
  }

  async getUserPoints(userId: string): Promise<UserPoints> {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${apiUrl}/user/points`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('포인트 정보 조회 실패');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('포인트 조회 오류:', error);
      // 실패 시 기본값 반환
      return {
        id: userId,
        userId,
        totalPoints: 0,
        availablePoints: 0,
        usedPoints: 0,
        expiredPoints: 0,
        lastUpdatedAt: new Date().toISOString()
      };
    }
  }

  private async addPoints(userId: string, amount: number, description: string, relatedDepositId?: string): Promise<void> {
    // 포인트 적립 처리
    console.log(`사용자 ${userId}에게 ${amount}P 적립: ${description}`);
  }

  private async deductPoints(userId: string, amount: number, description: string): Promise<void> {
    // 포인트 차감 처리
    console.log(`사용자 ${userId}에서 ${amount}P 차감: ${description}`);
  }
}

export default new DepositService();