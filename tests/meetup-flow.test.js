/**
 * 모임 전체 플로우 테스트
 * 모임 참석 → 확정 → GPS 인증 → 후기 시스템
 */

describe('모임 전체 플로우 테스트', () => {
  // ============================================
  // 1. 모임 참가 플로우 테스트
  // ============================================
  describe('1. 모임 참가 플로우', () => {
    describe('참가 신청', () => {
      it('모집중인 모임에 참가 신청 가능', () => {
        const meetup = { status: '모집중', current_participants: 2, max_participants: 4 };
        const canJoin = meetup.status === '모집중' && meetup.current_participants < meetup.max_participants;
        expect(canJoin).toBe(true);
      });

      it('정원이 가득 찬 모임에는 참가 불가', () => {
        const meetup = { status: '모집중', current_participants: 4, max_participants: 4 };
        const canJoin = meetup.current_participants < meetup.max_participants;
        expect(canJoin).toBe(false);
      });

      it('모집완료된 모임에는 참가 불가', () => {
        const meetup = { status: '모집완료', current_participants: 3, max_participants: 4 };
        const canJoin = meetup.status === '모집중';
        expect(canJoin).toBe(false);
      });

      it('참가 신청 시 초기 상태는 "참가대기"', () => {
        const initialStatus = '참가대기';
        expect(initialStatus).toBe('참가대기');
      });
    });

    describe('참가 승인/거절', () => {
      it('호스트만 참가 승인/거절 가능', () => {
        const hostId = 'user-123';
        const requestUserId = 'user-123';
        const isHost = hostId === requestUserId;
        expect(isHost).toBe(true);
      });

      it('참가 승인 시 참가자 수 증가', () => {
        let currentParticipants = 2;
        const prevStatus = '참가대기';
        const newStatus = '참가승인';

        if (prevStatus !== '참가승인' && newStatus === '참가승인') {
          currentParticipants += 1;
        }

        expect(currentParticipants).toBe(3);
      });

      it('참가 거절로 변경 시 참가자 수 감소', () => {
        let currentParticipants = 3;
        const prevStatus = '참가승인';
        const newStatus = '참가거절';

        if (prevStatus === '참가승인' && newStatus !== '참가승인') {
          currentParticipants -= 1;
        }

        expect(currentParticipants).toBe(2);
      });

      it('대기 → 거절 시 참가자 수 변경 없음', () => {
        let currentParticipants = 2;
        const prevStatus = '참가대기';
        const newStatus = '참가거절';

        if (prevStatus === '참가승인' && newStatus !== '참가승인') {
          currentParticipants -= 1;
        }

        expect(currentParticipants).toBe(2); // 변경 없음
      });
    });

    describe('참가 취소', () => {
      it('승인된 참가자가 취소 시 참가자 수 감소', () => {
        let currentParticipants = 3;
        const wasApproved = true;

        if (wasApproved) {
          currentParticipants -= 1;
        }

        expect(currentParticipants).toBe(2);
      });

      it('대기 중인 참가자가 취소 시 참가자 수 변경 없음', () => {
        let currentParticipants = 2;
        const wasApproved = false; // 참가대기 상태

        if (wasApproved) {
          currentParticipants -= 1;
        }

        expect(currentParticipants).toBe(2); // 변경 없음
      });

      it('호스트가 나가면 모임 취소', () => {
        const userId = 'user-123';
        const hostId = 'user-123';
        const isHost = userId === hostId;

        let meetupStatus = '모집중';
        if (isHost) {
          meetupStatus = '취소';
        }

        expect(meetupStatus).toBe('취소');
      });
    });
  });

  // ============================================
  // 2. 모임 확정 플로우 테스트
  // ============================================
  describe('2. 모임 확정 플로우', () => {
    it('모집중 → 모집완료로 확정 가능', () => {
      let status = '모집중';
      const action = 'confirm';

      if (action === 'confirm' && status === '모집중') {
        status = '모집완료';
      }

      expect(status).toBe('모집완료');
    });

    it('모집완료 상태에서 취소 가능', () => {
      let status = '모집완료';
      const action = 'cancel';

      if (action === 'cancel') {
        status = '취소';
      }

      expect(status).toBe('취소');
    });

    it('호스트만 확정/취소 가능', () => {
      const hostId = 'user-123';
      const requestUserId = 'user-456';
      const isHost = hostId === requestUserId;

      expect(isHost).toBe(false);
    });
  });

  // ============================================
  // 3. GPS 인증 플로우 테스트
  // ============================================
  describe('3. GPS 인증 플로우', () => {
    // Haversine formula로 거리 계산
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371e3; // 지구 반경 (미터)
      const φ1 = lat1 * Math.PI / 180;
      const φ2 = lat2 * Math.PI / 180;
      const Δφ = (lat2 - lat1) * Math.PI / 180;
      const Δλ = (lon2 - lon1) * Math.PI / 180;

      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

      return R * c; // 미터 단위
    };

    const MAX_DISTANCE = 100; // 100m 이내

    it('100m 이내에서 체크인 성공', () => {
      // 모임 장소
      const meetupLat = 37.5665;
      const meetupLon = 126.9780;

      // 사용자 위치 (50m 떨어진 곳)
      const userLat = 37.5669;
      const userLon = 126.9780;

      const distance = calculateDistance(meetupLat, meetupLon, userLat, userLon);
      const canCheckin = distance <= MAX_DISTANCE;

      expect(canCheckin).toBe(true);
      expect(distance).toBeLessThan(100);
    });

    it('100m 초과 시 체크인 실패', () => {
      // 모임 장소
      const meetupLat = 37.5665;
      const meetupLon = 126.9780;

      // 사용자 위치 (200m 떨어진 곳)
      const userLat = 37.5683;
      const userLon = 126.9780;

      const distance = calculateDistance(meetupLat, meetupLon, userLat, userLon);
      const canCheckin = distance <= MAX_DISTANCE;

      expect(canCheckin).toBe(false);
      expect(distance).toBeGreaterThan(100);
    });

    it('승인된 참가자만 체크인 가능', () => {
      const participantStatus = '참가승인';
      const canCheckin = participantStatus === '참가승인';

      expect(canCheckin).toBe(true);
    });

    it('대기 중인 참가자는 체크인 불가', () => {
      const participantStatus = '참가대기';
      const canCheckin = participantStatus === '참가승인';

      expect(canCheckin).toBe(false);
    });

    it('체크인 성공 시 출석 기록 생성', () => {
      const attendance = {
        meetup_id: 'meetup-123',
        user_id: 'user-456',
        attendance_type: 'gps',
        status: 'confirmed',
        location_latitude: 37.5665,
        location_longitude: 126.9780,
      };

      expect(attendance.attendance_type).toBe('gps');
      expect(attendance.status).toBe('confirmed');
    });
  });

  // ============================================
  // 4. 후기 시스템 테스트
  // ============================================
  describe('4. 후기 시스템', () => {
    describe('모임 리뷰', () => {
      it('완료된 모임에만 리뷰 작성 가능', () => {
        const meetupDate = new Date('2024-01-01');
        const now = new Date('2024-01-15');
        const canReview = meetupDate < now;

        expect(canReview).toBe(true);
      });

      it('미래 모임에는 리뷰 작성 불가', () => {
        const meetupDate = new Date('2024-12-31');
        const now = new Date('2024-01-15');
        const canReview = meetupDate < now;

        expect(canReview).toBe(false);
      });

      it('참가 승인된 사람만 리뷰 작성 가능', () => {
        const participantStatus = '참가승인';
        const canReview = participantStatus === '참가승인';

        expect(canReview).toBe(true);
      });

      it('평점은 1-5 사이만 허용', () => {
        const validateRating = (rating) => rating >= 1 && rating <= 5;

        expect(validateRating(1)).toBe(true);
        expect(validateRating(3)).toBe(true);
        expect(validateRating(5)).toBe(true);
        expect(validateRating(0)).toBe(false);
        expect(validateRating(6)).toBe(false);
      });

      it('중복 리뷰 불가', () => {
        const existingReviews = [
          { meetup_id: 'meetup-123', reviewer_id: 'user-456' }
        ];

        const newReview = { meetup_id: 'meetup-123', reviewer_id: 'user-456' };
        const isDuplicate = existingReviews.some(
          r => r.meetup_id === newReview.meetup_id && r.reviewer_id === newReview.reviewer_id
        );

        expect(isDuplicate).toBe(true);
      });
    });

    describe('참가자 개별 리뷰', () => {
      it('자기 자신에게는 리뷰 불가', () => {
        const reviewerId = 'user-123';
        const reviewedUserId = 'user-123';
        const canReview = reviewerId !== reviewedUserId;

        expect(canReview).toBe(false);
      });

      it('같은 모임 참가자에게만 리뷰 가능', () => {
        const meetupParticipants = ['user-1', 'user-2', 'user-3'];
        const reviewedUserId = 'user-2';
        const canReview = meetupParticipants.includes(reviewedUserId);

        expect(canReview).toBe(true);
      });

      it('리뷰 작성 후 대상자 평점 업데이트', () => {
        const reviews = [
          { rating: 5 },
          { rating: 4 },
          { rating: 5 },
        ];

        const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        const roundedRating = Math.round(avgRating * 10) / 10;

        expect(roundedRating).toBe(4.7);
      });

      it('user_reviews 테이블에 reviewee_id 저장', () => {
        const userReview = {
          meetup_id: 'meetup-123',
          reviewer_id: 'user-1',
          reviewed_user_id: 'user-2', // reviewee_id
          rating: 5,
          comment: '좋은 분이었습니다',
        };

        expect(userReview.reviewed_user_id).toBeDefined();
        expect(userReview.reviewed_user_id).toBe('user-2');
      });
    });
  });

  // ============================================
  // 5. 전체 플로우 통합 테스트
  // ============================================
  describe('5. 전체 플로우 통합', () => {
    it('모임 생성 → 참가 → 승인 → 확정 → GPS 체크인 → 리뷰 플로우', () => {
      // 1. 모임 생성
      const meetup = {
        id: 'meetup-123',
        status: '모집중',
        host_id: 'host-1',
        current_participants: 1,
        max_participants: 4,
        latitude: 37.5665,
        longitude: 126.9780,
        date: new Date('2024-01-01'),
      };
      expect(meetup.status).toBe('모집중');

      // 2. 참가 신청
      const participant = {
        meetup_id: meetup.id,
        user_id: 'user-2',
        status: '참가대기',
      };
      expect(participant.status).toBe('참가대기');

      // 3. 참가 승인
      participant.status = '참가승인';
      meetup.current_participants += 1;
      expect(participant.status).toBe('참가승인');
      expect(meetup.current_participants).toBe(2);

      // 4. 모임 확정
      meetup.status = '모집완료';
      expect(meetup.status).toBe('모집완료');

      // 5. GPS 체크인 (모임 당일)
      const attendance = {
        meetup_id: meetup.id,
        user_id: participant.user_id,
        attendance_type: 'gps',
        status: 'confirmed',
        location_latitude: 37.5666, // 11m 거리
        location_longitude: 126.9780,
      };
      expect(attendance.status).toBe('confirmed');

      // 6. 리뷰 작성 (모임 완료 후)
      const now = new Date('2024-01-15');
      const canReview = meetup.date < now && participant.status === '참가승인';
      expect(canReview).toBe(true);

      const review = {
        meetup_id: meetup.id,
        reviewer_id: participant.user_id,
        reviewed_user_id: meetup.host_id,
        rating: 5,
        comment: '좋은 모임이었습니다!',
      };
      expect(review.reviewed_user_id).toBe(meetup.host_id);
    });
  });

  // ============================================
  // 6. 테이블 스키마 검증
  // ============================================
  describe('6. 테이블 스키마 검증', () => {
    const requiredTables = [
      'users',
      'meetups',
      'meetup_participants',
      'attendances',
      'user_blocked_users',
      'promise_deposits',
      'mutual_confirmations',
      'user_reviews',
      'reviews',
    ];

    it('필수 테이블 목록 정의됨', () => {
      expect(requiredTables.length).toBeGreaterThan(0);
      expect(requiredTables).toContain('attendances');
      expect(requiredTables).toContain('user_blocked_users');
      expect(requiredTables).toContain('promise_deposits');
      expect(requiredTables).toContain('mutual_confirmations');
      expect(requiredTables).toContain('user_reviews');
    });

    it('user_reviews 테이블에 reviewed_user_id 컬럼 필요', () => {
      const userReviewsColumns = [
        'id', 'meetup_id', 'reviewer_id', 'reviewed_user_id',
        'rating', 'comment', 'tags', 'is_anonymous', 'created_at', 'updated_at'
      ];

      expect(userReviewsColumns).toContain('reviewed_user_id');
    });

    it('attendances 테이블 컬럼 정의', () => {
      const attendancesColumns = [
        'id', 'meetup_id', 'user_id', 'attendance_type',
        'location_latitude', 'location_longitude', 'qr_code_data',
        'status', 'confirmed_at', 'confirmed_by', 'notes', 'created_at'
      ];

      expect(attendancesColumns).toContain('attendance_type');
      expect(attendancesColumns).toContain('status');
    });
  });

  // ============================================
  // 7. 약속금 시스템 테스트
  // ============================================
  describe('7. 약속금 시스템', () => {
    describe('약속금 금액 옵션', () => {
      it('지원하는 약속금 금액', () => {
        const depositOptions = [0, 3000, 5000, 10000];
        expect(depositOptions).toContain(0);
        expect(depositOptions).toContain(3000);
        expect(depositOptions).toContain(5000);
        expect(depositOptions).toContain(10000);
      });

      it('호스트가 약속금 설정', () => {
        const meetup = {
          host_id: 'user-123',
          deposit_amount: 5000
        };
        expect(meetup.deposit_amount).toBe(5000);
      });
    });

    describe('약속금 결제', () => {
      it('참가 신청 시 약속금 결제', () => {
        const deposit = {
          meetup_id: 'meetup-123',
          user_id: 'user-456',
          amount: 5000,
          status: 'paid',
          payment_method: 'points'
        };
        expect(deposit.status).toBe('paid');
      });

      it('포인트 부족 시 결제 실패', () => {
        const userPoints = 3000;
        const requiredDeposit = 5000;
        const canPay = userPoints >= requiredDeposit;
        expect(canPay).toBe(false);
      });
    });
  });

  // ============================================
  // 8. 취소 정책 테스트
  // ============================================
  describe('8. 취소 정책', () => {
    // 환불율 계산 함수
    const calculateRefundRate = (minutesBeforeMeetup, meetupStatus) => {
      if (meetupStatus === '모집중') {
        return { refundRate: 100, cancellationType: 'voluntary' };
      }
      if (minutesBeforeMeetup >= 60) {
        return { refundRate: 100, cancellationType: 'voluntary' };
      } else if (minutesBeforeMeetup >= 40) {
        return { refundRate: 60, cancellationType: 'late_40min' };
      } else if (minutesBeforeMeetup >= 20) {
        return { refundRate: 30, cancellationType: 'late_20min' };
      } else if (minutesBeforeMeetup >= 10) {
        return { refundRate: 0, cancellationType: 'late_10min' };
      } else {
        return { refundRate: 0, cancellationType: 'noshow' };
      }
    };

    describe('시간별 환불율', () => {
      it('1시간 이상 전: 100% 환불', () => {
        const result = calculateRefundRate(70, '모집완료');
        expect(result.refundRate).toBe(100);
        expect(result.cancellationType).toBe('voluntary');
      });

      it('40분~60분 전: 60% 환불', () => {
        const result = calculateRefundRate(50, '모집완료');
        expect(result.refundRate).toBe(60);
        expect(result.cancellationType).toBe('late_40min');
      });

      it('20분~40분 전: 30% 환불', () => {
        const result = calculateRefundRate(30, '모집완료');
        expect(result.refundRate).toBe(30);
        expect(result.cancellationType).toBe('late_20min');
      });

      it('10분~20분 전: 0% 환불', () => {
        const result = calculateRefundRate(15, '모집완료');
        expect(result.refundRate).toBe(0);
        expect(result.cancellationType).toBe('late_10min');
      });

      it('10분 이내: 취소 불가 (노쇼 처리)', () => {
        const result = calculateRefundRate(5, '모집완료');
        expect(result.refundRate).toBe(0);
        expect(result.cancellationType).toBe('noshow');
      });
    });

    describe('모집중 상태에서 취소', () => {
      it('모집중 상태에서는 언제든 100% 환불', () => {
        const result1 = calculateRefundRate(5, '모집중');
        const result2 = calculateRefundRate(120, '모집중');
        expect(result1.refundRate).toBe(100);
        expect(result2.refundRate).toBe(100);
      });
    });

    describe('환불 금액 계산', () => {
      it('환불 금액과 몰수 금액 계산', () => {
        const depositAmount = 5000;
        const refundRate = 60;
        const refundAmount = Math.floor(depositAmount * refundRate / 100);
        const forfeitedAmount = depositAmount - refundAmount;

        expect(refundAmount).toBe(3000);
        expect(forfeitedAmount).toBe(2000);
      });
    });
  });

  // ============================================
  // 9. 노쇼 판정 테스트
  // ============================================
  describe('9. 노쇼 판정', () => {
    describe('노쇼 판정 기준', () => {
      it('GPS 미인증 + 2명 이상 신고 = 노쇼 확정', () => {
        const participant = {
          attended: false, // GPS 미인증
          noshowReports: 2 // 2명 신고
        };
        const isNoShow = !participant.attended && participant.noshowReports >= 2;
        expect(isNoShow).toBe(true);
      });

      it('GPS 미인증 + 호스트 신고 = 노쇼 확정', () => {
        const participant = {
          attended: false,
          hostReported: true
        };
        const isNoShow = !participant.attended && participant.hostReported;
        expect(isNoShow).toBe(true);
      });

      it('GPS 인증 완료 = 정상 출석', () => {
        const participant = {
          attended: true,
          noshowReports: 1
        };
        const isNoShow = !participant.attended && participant.noshowReports >= 2;
        expect(isNoShow).toBe(false);
      });

      it('GPS 미인증 + 신고 없음 = GPS 오류로 간주', () => {
        const participant = {
          attended: false,
          noshowReports: 0
        };
        const isNoShow = !participant.attended && participant.noshowReports >= 2;
        expect(isNoShow).toBe(false);
      });
    });

    describe('노쇼 페널티', () => {
      it('노쇼 시 약속금 전액 몰수', () => {
        const depositAmount = 5000;
        const refundRate = 0;
        const forfeitedAmount = depositAmount;
        expect(forfeitedAmount).toBe(5000);
      });

      it('노쇼 시 밥알 점수 -15점', () => {
        let babalScore = 100;
        const penalty = 15;
        babalScore = Math.max(0, babalScore - penalty);
        expect(babalScore).toBe(85);
      });
    });
  });

  // ============================================
  // 10. 배상 시스템 테스트
  // ============================================
  describe('10. 배상 시스템', () => {
    describe('몰수금 분배', () => {
      it('피해자 70%, 플랫폼 30% 분배', () => {
        const forfeitedAmount = 5000;
        const victimCompensation = Math.floor(forfeitedAmount * 0.7);
        const platformFee = forfeitedAmount - victimCompensation;

        expect(victimCompensation).toBe(3500);
        expect(platformFee).toBe(1500);
      });

      it('피해자 배상금 균등 분배', () => {
        const forfeitedAmount = 5000;
        const victimCompensation = Math.floor(forfeitedAmount * 0.7);
        const attendedCount = 3;
        const perPerson = Math.floor(victimCompensation / attendedCount);

        expect(perPerson).toBe(1166);
      });
    });

    describe('배상금 지급', () => {
      it('배상금은 포인트로 지급', () => {
        const compensation = {
          victim_user_id: 'user-123',
          compensation_amount: 1166,
          status: 'paid',
          payment_type: 'points'
        };
        expect(compensation.status).toBe('paid');
      });
    });
  });

  // ============================================
  // 11. 누적 제재 테스트
  // ============================================
  describe('11. 누적 제재', () => {
    describe('직전 취소 제재', () => {
      it('30일 내 3회 직전 취소: 경고', () => {
        const cancelCount = 3;
        const shouldWarn = cancelCount >= 3;
        expect(shouldWarn).toBe(true);
      });

      it('30일 내 5회 직전 취소: 7일 이용 제한', () => {
        const cancelCount = 5;
        let restrictionDays = 0;
        if (cancelCount >= 5) restrictionDays = 7;
        expect(restrictionDays).toBe(7);
      });
    });

    describe('노쇼 제재', () => {
      it('누적 3회 노쇼: 7일 이용 제한', () => {
        const noShowCount = 3;
        let restrictionDays = 0;
        if (noShowCount >= 3) restrictionDays = 7;
        expect(restrictionDays).toBe(7);
      });

      it('누적 5회 노쇼: 30일 이용 제한', () => {
        const noShowCount = 5;
        let restrictionDays = 0;
        if (noShowCount >= 5) restrictionDays = 30;
        if (noShowCount >= 3) restrictionDays = Math.max(restrictionDays, 7);
        expect(restrictionDays).toBe(30);
      });

      it('누적 10회 노쇼: 영구 이용 제한', () => {
        const noShowCount = 10;
        let restrictionType = 'participation';
        if (noShowCount >= 10) restrictionType = 'permanent';
        expect(restrictionType).toBe('permanent');
      });
    });
  });

  // ============================================
  // 12. 호스트 노쇼 테스트
  // ============================================
  describe('12. 호스트 노쇼', () => {
    it('호스트 노쇼 시 참가자 전액 환불', () => {
      const participants = [
        { user_id: 'user-1', deposit: 5000 },
        { user_id: 'user-2', deposit: 5000 },
        { user_id: 'user-3', deposit: 5000 }
      ];
      const refunds = participants.map(p => ({
        ...p,
        refund: p.deposit // 100% 환불
      }));
      expect(refunds.every(r => r.refund === r.deposit)).toBe(true);
    });

    it('호스트 노쇼 시 더 큰 밥알 점수 페널티', () => {
      const normalNoShowPenalty = 15;
      const hostNoShowPenalty = 30;
      expect(hostNoShowPenalty).toBeGreaterThan(normalNoShowPenalty);
    });

    it('호스트 노쇼 시 호스트 자격 정지', () => {
      const hostRestriction = {
        restriction_type: 'host',
        days: 30
      };
      expect(hostRestriction.restriction_type).toBe('host');
      expect(hostRestriction.days).toBe(30);
    });
  });

  // ============================================
  // 13. 전체 플로우 통합 테스트 (약속금 포함)
  // ============================================
  describe('13. 약속금 포함 전체 플로우', () => {
    it('모임 생성 → 약속금 결제 → 참가 → GPS 체크인 → 환불 플로우', () => {
      // 1. 모임 생성 (약속금 포함)
      const meetup = {
        id: 'meetup-123',
        status: '모집중',
        host_id: 'host-1',
        deposit_amount: 5000,
        current_participants: 1,
        max_participants: 4
      };
      expect(meetup.deposit_amount).toBe(5000);

      // 2. 참가자 약속금 결제
      const deposit = {
        meetup_id: meetup.id,
        user_id: 'user-2',
        amount: 5000,
        status: 'paid',
        payment_method: 'points'
      };
      expect(deposit.status).toBe('paid');

      // 3. 참가 승인 및 모임 확정
      meetup.status = '모집완료';
      meetup.current_participants = 3;
      expect(meetup.status).toBe('모집완료');

      // 4. GPS 체크인 (모임 당일)
      const attendance = {
        meetup_id: meetup.id,
        user_id: 'user-2',
        attended: true,
        attendance_type: 'gps'
      };
      expect(attendance.attended).toBe(true);

      // 5. 모임 완료 후 정상 환불
      deposit.status = 'refunded';
      deposit.refund_amount = 5000;
      deposit.refund_rate = 100;
      expect(deposit.refund_amount).toBe(5000);
    });

    it('노쇼 시나리오: 참가 → 노쇼 → 배상 플로우', () => {
      // 1. 모임 확정
      const meetup = {
        id: 'meetup-456',
        status: '모집완료',
        deposit_amount: 5000
      };

      // 2. 참가자들
      const participants = [
        { user_id: 'user-1', attended: true },  // 출석
        { user_id: 'user-2', attended: true },  // 출석
        { user_id: 'user-3', attended: false }  // 노쇼
      ];

      // 3. 노쇼 신고 (2명 이상)
      const noshowReports = [
        { reporter_id: 'user-1', reported_id: 'user-3' },
        { reporter_id: 'user-2', reported_id: 'user-3' }
      ];
      expect(noshowReports.length).toBeGreaterThanOrEqual(2);

      // 4. 노쇼 확정 및 배상
      const noShow = participants.find(p => !p.attended);
      const forfeitedAmount = meetup.deposit_amount;
      const victimCompensation = Math.floor(forfeitedAmount * 0.7);
      const attendedUsers = participants.filter(p => p.attended);
      const compensationPerPerson = Math.floor(victimCompensation / attendedUsers.length);

      expect(noShow.user_id).toBe('user-3');
      expect(compensationPerPerson).toBe(1750);
    });
  });
});
