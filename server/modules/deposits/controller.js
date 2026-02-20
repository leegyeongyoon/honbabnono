const pool = require('../../config/database');
const portone = require('../../config/portone');

// ============================================
// PortOne 결제 연동 API
// ============================================

// 결제 준비 (merchant_uid 생성 및 pending 레코드 생성)
exports.preparePayment = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount, meetupId, paymentMethod } = req.body;

    console.log('💳 PortOne 결제 준비 요청:', { userId, amount, meetupId, paymentMethod });

    if (!amount || !meetupId) {
      return res.status(400).json({
        success: false,
        error: '결제 금액과 약속 정보가 필요합니다.'
      });
    }

    // 이용 제한 여부 확인
    const restrictionCheck = await pool.query(`
      SELECT * FROM user_restrictions
      WHERE user_id = $1
        AND restriction_type IN ('participation', 'permanent')
        AND restricted_until > NOW()
    `, [userId]);

    if (restrictionCheck.rows.length > 0) {
      const restriction = restrictionCheck.rows[0];
      return res.status(403).json({
        success: false,
        error: '현재 이용 제한 중입니다.',
        restrictedUntil: restriction.restricted_until,
        reason: restriction.reason
      });
    }

    // 이미 결제한 약속금이 있는지 확인 (임시 meetupId가 아닌 경우)
    const isTemporaryMeetupId = typeof meetupId === 'string' && meetupId.startsWith('temp-');
    if (!isTemporaryMeetupId) {
      const existingDeposit = await pool.query(
        'SELECT id FROM promise_deposits WHERE meetup_id = $1 AND user_id = $2 AND status IN (\'pending\', \'paid\')',
        [meetupId, userId]
      );

      if (existingDeposit.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: '이미 해당 약속의 약속금이 존재합니다.'
        });
      }
    }

    // merchant_uid 생성 (고유한 주문번호)
    const merchantUid = `deposit_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // 실제 meetupId가 아닌 임시 ID인 경우 임시 meetup 생성
    let actualMeetupId = meetupId;
    if (isTemporaryMeetupId) {
      const tempMeetupResult = await pool.query(`
        INSERT INTO meetups (
          id, title, description, location, date, time,
          max_participants, category, host_id, status,
          created_at, updated_at
        ) VALUES (
          gen_random_uuid(), '임시 약속 (결제 진행 중)', '약속 만들기 진행 중', '미정',
          CURRENT_DATE + INTERVAL '1 day', '12:00:00',
          2, '기타', $1, '모집중',
          NOW(), NOW()
        ) RETURNING id
      `, [userId]);

      actualMeetupId = tempMeetupResult.rows[0].id;
    }

    // pending 상태의 약속금 레코드 생성
    const depositResult = await pool.query(`
      INSERT INTO promise_deposits (
        meetup_id, user_id, amount, status, payment_method, payment_id, created_at, updated_at
      ) VALUES ($1, $2, $3, 'pending', $4, $5, NOW(), NOW())
      RETURNING id
    `, [actualMeetupId, userId, amount, paymentMethod || 'card', merchantUid]);

    const depositId = depositResult.rows[0].id;

    console.log('✅ 결제 준비 완료:', { depositId, merchantUid, actualMeetupId });

    // 클라이언트 SDK에 필요한 데이터 반환
    res.json({
      success: true,
      paymentData: {
        depositId,
        merchantUid,
        meetupId: actualMeetupId,
        amount,
        storeId: portone.config.storeId,
        name: '잇테이블 약속금',
        buyerName: req.user.name || '사용자',
        buyerEmail: req.user.email || '',
      }
    });
  } catch (error) {
    console.error('❌ 결제 준비 실패:', error);
    res.status(500).json({
      success: false,
      error: '결제 준비 중 오류가 발생했습니다.'
    });
  }
};

// 결제 검증 (클라이언트에서 결제 완료 후 호출)
exports.verifyPayment = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { impUid, merchantUid, depositId } = req.body;

    console.log('🔍 PortOne 결제 검증 요청:', { userId, impUid, merchantUid, depositId });

    if (!impUid || !merchantUid) {
      return res.status(400).json({
        success: false,
        error: '결제 검증에 필요한 정보가 누락되었습니다.'
      });
    }

    // DB에서 해당 결제 레코드 조회
    const depositResult = await pool.query(`
      SELECT * FROM promise_deposits
      WHERE payment_id = $1 AND user_id = $2 AND status = 'pending'
    `, [merchantUid, userId]);

    if (depositResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '결제 정보를 찾을 수 없습니다.'
      });
    }

    const deposit = depositResult.rows[0];

    // PortOne API로 실제 결제 정보 조회
    const paymentData = await portone.verifyPayment(impUid);

    // 금액 검증: DB에 저장된 금액과 실제 결제 금액이 일치하는지 확인
    if (paymentData.amount !== deposit.amount) {
      console.error('❌ 결제 금액 불일치:', {
        expected: deposit.amount,
        actual: paymentData.amount,
        impUid,
        merchantUid
      });

      // 결제 금액이 맞지 않으면 결제 취소 처리
      try {
        await portone.cancelPayment(impUid, '결제 금액 불일치로 인한 자동 취소');
      } catch (cancelError) {
        console.error('❌ 자동 취소 실패:', cancelError);
      }

      return res.status(400).json({
        success: false,
        error: '결제 금액이 일치하지 않습니다. 결제가 취소되었습니다.'
      });
    }

    // 결제 상태 확인
    if (paymentData.status !== 'paid') {
      return res.status(400).json({
        success: false,
        error: `결제가 완료되지 않았습니다. (상태: ${paymentData.status})`
      });
    }

    // 결제 성공 - DB 업데이트
    await pool.query(`
      UPDATE promise_deposits
      SET status = 'paid',
          payment_id = $1,
          payment_method = $2,
          paid_at = NOW(),
          updated_at = NOW()
      WHERE id = $3
    `, [impUid, paymentData.pay_method || 'card', deposit.id]);

    console.log('✅ 결제 검증 완료:', { depositId: deposit.id, impUid, amount: deposit.amount });

    res.json({
      success: true,
      message: '결제가 성공적으로 검증되었습니다.',
      deposit: {
        id: deposit.id,
        meetupId: deposit.meetup_id,
        amount: deposit.amount,
        status: 'paid',
        impUid: impUid,
      }
    });
  } catch (error) {
    console.error('❌ 결제 검증 실패:', error);
    res.status(500).json({
      success: false,
      error: '결제 검증 중 오류가 발생했습니다.'
    });
  }
};

// PortOne 웹훅 핸들러 (결제 상태 변경 알림)
exports.handleWebhook = async (req, res) => {
  try {
    const { imp_uid, merchant_uid, status } = req.body;

    console.log('🔔 PortOne 웹훅 수신:', { imp_uid, merchant_uid, status });

    if (!imp_uid) {
      return res.status(400).json({
        success: false,
        error: '웹훅 데이터가 올바르지 않습니다.'
      });
    }

    // PortOne API로 실제 결제 정보 조회하여 검증
    const paymentData = await portone.verifyPayment(imp_uid);

    // merchant_uid로 DB 레코드 조회
    const depositResult = await pool.query(`
      SELECT * FROM promise_deposits
      WHERE payment_id = $1 OR payment_id = $2
    `, [merchant_uid, imp_uid]);

    if (depositResult.rows.length === 0) {
      console.warn('⚠️ 웹훅: 매칭되는 결제 레코드 없음:', { imp_uid, merchant_uid });
      // 웹훅은 200을 반환해야 재시도를 멈춤
      return res.status(200).json({
        success: false,
        error: '매칭되는 결제 레코드를 찾을 수 없습니다.'
      });
    }

    const deposit = depositResult.rows[0];

    // 결제 상태에 따른 처리
    switch (paymentData.status) {
      case 'paid':
        // 결제 완료 확인 - 금액 검증
        if (paymentData.amount === deposit.amount) {
          await pool.query(`
            UPDATE promise_deposits
            SET status = 'paid',
                payment_id = $1,
                paid_at = NOW(),
                updated_at = NOW()
            WHERE id = $2 AND status = 'pending'
          `, [imp_uid, deposit.id]);
          console.log('✅ 웹훅: 결제 확정:', { depositId: deposit.id, imp_uid });
        } else {
          // 금액 불일치 - 결제 취소
          console.error('❌ 웹훅: 금액 불일치, 결제 취소 시도:', {
            expected: deposit.amount,
            actual: paymentData.amount
          });
          try {
            await portone.cancelPayment(imp_uid, '결제 금액 불일치');
          } catch (cancelError) {
            console.error('❌ 웹훅: 자동 취소 실패:', cancelError);
          }
        }
        break;

      case 'cancelled':
        // 결제 취소됨
        await pool.query(`
          UPDATE promise_deposits
          SET status = 'refunded',
              refund_amount = $1,
              refund_reason = '결제 취소 (PortOne 웹훅)',
              cancelled_at = NOW(),
              updated_at = NOW()
          WHERE id = $2
        `, [paymentData.cancel_amount || deposit.amount, deposit.id]);
        console.log('✅ 웹훅: 결제 취소 반영:', { depositId: deposit.id, imp_uid });
        break;

      case 'failed':
        // 결제 실패
        await pool.query(`
          UPDATE promise_deposits
          SET status = 'pending',
              updated_at = NOW()
          WHERE id = $1 AND status = 'pending'
        `, [deposit.id]);
        console.log('⚠️ 웹훅: 결제 실패:', { depositId: deposit.id, imp_uid });
        break;

      default:
        console.log('ℹ️ 웹훅: 처리하지 않는 상태:', paymentData.status);
    }

    // 웹훅은 항상 200 응답
    res.status(200).json({
      success: true,
      message: '웹훅 처리 완료'
    });
  } catch (error) {
    console.error('❌ 웹훅 처리 실패:', error);
    // 웹훅은 200을 반환해야 재시도를 멈춤
    res.status(200).json({
      success: false,
      error: '웹훅 처리 중 오류가 발생했습니다.'
    });
  }
};

// PortOne을 통한 약속금 환불
exports.refundDepositViaPortone = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { depositId, reason } = req.body;

    console.log('💰 PortOne 환불 요청:', { depositId, reason, userId });

    if (!depositId) {
      return res.status(400).json({
        success: false,
        error: '환불할 약속금 정보가 필요합니다.'
      });
    }

    // 약속금 정보 조회
    const depositResult = await pool.query(`
      SELECT * FROM promise_deposits
      WHERE id = $1 AND user_id = $2 AND status = 'paid'
    `, [depositId, userId]);

    if (depositResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '환불 가능한 약속금을 찾을 수 없습니다.'
      });
    }

    const deposit = depositResult.rows[0];
    const impUid = deposit.payment_id;

    // payment_id가 포인트 결제인 경우 (imp_uid가 아닌 경우) 기존 환불 로직 사용
    if (!impUid || impUid.startsWith('points_') || impUid.startsWith('kakao_') || impUid.startsWith('card_')) {
      // 기존 포인트 환불 로직으로 폴백
      const refundAmount = deposit.amount;

      await pool.query(`
        UPDATE promise_deposits
        SET status = 'refunded',
            refund_amount = $1,
            refund_reason = $2,
            cancelled_at = NOW(),
            updated_at = NOW()
        WHERE id = $3
      `, [refundAmount, reason || '사용자 요청', depositId]);

      // 포인트로 환불
      await pool.query(`
        INSERT INTO user_points (user_id, total_points, available_points, used_points, expired_points)
        VALUES ($1, $2, $2, 0, 0)
        ON CONFLICT (user_id)
        DO UPDATE SET
          available_points = user_points.available_points + $2,
          updated_at = NOW()
      `, [userId, refundAmount]);

      await pool.query(`
        INSERT INTO point_transactions (user_id, transaction_type, amount, description, created_at)
        VALUES ($1, 'earned', $2, $3, NOW())
      `, [userId, refundAmount, `약속금 환불 (보증금 ID: ${depositId})`]);

      return res.json({
        success: true,
        message: '약속금이 포인트로 환불되었습니다.',
        refundAmount,
        refundMethod: 'points'
      });
    }

    // PortOne API를 통한 실제 결제 취소
    const cancelResult = await portone.cancelPayment(
      impUid,
      reason || '사용자 요청에 의한 약속금 환불',
      deposit.amount
    );

    // DB 업데이트
    await pool.query(`
      UPDATE promise_deposits
      SET status = 'refunded',
          refund_amount = $1,
          refund_reason = $2,
          cancelled_at = NOW(),
          updated_at = NOW()
      WHERE id = $3
    `, [cancelResult.cancel_amount || deposit.amount, reason || '사용자 요청', depositId]);

    console.log('✅ PortOne 환불 완료:', {
      depositId,
      impUid,
      cancelAmount: cancelResult.cancel_amount
    });

    res.json({
      success: true,
      message: '약속금이 환불되었습니다.',
      refundAmount: cancelResult.cancel_amount || deposit.amount,
      refundMethod: 'portone'
    });
  } catch (error) {
    console.error('❌ PortOne 환불 실패:', error);
    res.status(500).json({
      success: false,
      error: '환불 처리 중 오류가 발생했습니다.'
    });
  }
};

// 약속금 결제
exports.createPayment = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount, meetupId, paymentMethod } = req.body;

    console.log('💳 약속금 결제 요청:', { userId, amount, meetupId, paymentMethod });

    if (!amount || !meetupId || !paymentMethod) {
      return res.status(400).json({
        success: false,
        error: '필수 정보가 누락되었습니다.'
      });
    }

    // 이용 제한 여부 확인
    const restrictionCheck = await pool.query(`
      SELECT * FROM user_restrictions
      WHERE user_id = $1
        AND restriction_type IN ('participation', 'permanent')
        AND restricted_until > NOW()
    `, [userId]);

    if (restrictionCheck.rows.length > 0) {
      const restriction = restrictionCheck.rows[0];
      return res.status(403).json({
        success: false,
        error: '현재 이용 제한 중입니다.',
        restrictedUntil: restriction.restricted_until,
        reason: restriction.reason
      });
    }

    // 실제 meetupId가 아닌 임시 ID인 경우 임시 meetup 생성
    const isTemporaryMeetupId = meetupId.startsWith('temp-');
    let actualMeetupId = meetupId;

    if (isTemporaryMeetupId) {
      const tempMeetupResult = await pool.query(`
        INSERT INTO meetups (
          id, title, description, location, date, time,
          max_participants, category, host_id, status,
          created_at, updated_at
        ) VALUES (
          gen_random_uuid(), '임시 약속 (결제 진행 중)', '약속 만들기 진행 중', '미정',
          CURRENT_DATE + INTERVAL '1 day', '12:00:00',
          2, '기타', $1, '모집중',
          NOW(), NOW()
        ) RETURNING id
      `, [userId]);

      actualMeetupId = tempMeetupResult.rows[0].id;
      console.log('🎫 임시 meetup 생성:', actualMeetupId);
    } else {
      // 이미 결제한 약속금이 있는지 확인
      const existingDeposit = await pool.query(
        'SELECT id FROM promise_deposits WHERE meetup_id = $1 AND user_id = $2',
        [meetupId, userId]
      );

      if (existingDeposit.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: '이미 해당 약속의 약속금을 결제하셨습니다.'
        });
      }
    }

    let paymentId;
    let redirectUrl;

    switch (paymentMethod) {
      case 'kakaopay':
        paymentId = `kakao_${Date.now()}`;
        redirectUrl = `https://mockup-kakaopay.com/pay?amount=${amount}`;
        break;
      case 'card':
        paymentId = `card_${Date.now()}`;
        break;
      case 'points':
        // 포인트 잔액 확인
        const pointsResult = await pool.query(
          'SELECT available_points FROM user_points WHERE user_id = $1',
          [userId]
        );

        if (pointsResult.rows.length === 0 || pointsResult.rows[0].available_points < amount) {
          return res.status(400).json({
            success: false,
            error: '보유 포인트가 부족합니다.'
          });
        }

        // 포인트 차감
        await pool.query(`
          UPDATE user_points
          SET available_points = available_points - $1,
              used_points = used_points + $1,
              updated_at = NOW()
          WHERE user_id = $2
        `, [amount, userId]);

        // 포인트 거래 내역 추가
        const description = isTemporaryMeetupId
          ? '약속금 결제 (임시 결제)'
          : `약속금 결제 (약속 ID: ${meetupId})`;
        await pool.query(`
          INSERT INTO point_transactions (user_id, transaction_type, amount, description, created_at)
          VALUES ($1, 'used', $2, $3, NOW())
        `, [userId, amount, description]);

        paymentId = `points_${Date.now()}`;
        break;
      default:
        return res.status(400).json({
          success: false,
          error: '지원하지 않는 결제 방식입니다.'
        });
    }

    // 약속금 기록 저장
    const depositResult = await pool.query(`
      INSERT INTO promise_deposits (
        meetup_id, user_id, amount, status, payment_method, payment_id, deposited_at, created_at, updated_at
      ) VALUES ($1, $2, $3, 'paid', $4, $5, NOW(), NOW(), NOW())
      RETURNING id
    `, [actualMeetupId, userId, amount, paymentMethod, paymentId]);

    const depositId = depositResult.rows[0].id;

    console.log('✅ 약속금 결제 완료:', { depositId, paymentId, actualMeetupId });

    res.json({
      success: true,
      paymentId: depositId,
      meetupId: actualMeetupId,
      redirectUrl
    });
  } catch (error) {
    console.error('❌ 약속금 결제 실패:', error);
    res.status(500).json({
      success: false,
      error: '결제 처리 중 오류가 발생했습니다.'
    });
  }
};

// 약속금 환불
exports.refundDeposit = async (req, res) => {
  try {
    const { id: depositId } = req.params;
    const { reason } = req.body;
    const userId = req.user.userId;

    console.log('💰 약속금 환불 요청:', { depositId, reason, userId });

    const depositResult = await pool.query(`
      SELECT * FROM promise_deposits
      WHERE id = $1 AND user_id = $2 AND status = 'paid'
    `, [depositId, userId]);

    if (depositResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '환불 가능한 약속금을 찾을 수 없습니다.'
      });
    }

    const deposit = depositResult.rows[0];
    const refundAmount = deposit.amount;

    await pool.query(`
      UPDATE promise_deposits
      SET status = 'refunded',
          refund_amount = $1,
          refund_reason = $2,
          returned_at = NOW(),
          updated_at = NOW()
      WHERE id = $3
    `, [refundAmount, reason, depositId]);

    // 포인트로 환불
    await pool.query(`
      INSERT INTO user_points (user_id, total_points, available_points, used_points, expired_points)
      VALUES ($1, $2, $2, 0, 0)
      ON CONFLICT (user_id)
      DO UPDATE SET
        available_points = user_points.available_points + $2,
        updated_at = NOW()
    `, [userId, refundAmount]);

    // 포인트 거래 내역 추가
    await pool.query(`
      INSERT INTO point_transactions (user_id, transaction_type, amount, description, created_at)
      VALUES ($1, 'earned', $2, $3, NOW())
    `, [userId, refundAmount, `약속금 환불 (보증금 ID: ${depositId})`]);

    console.log('✅ 약속금 환불 완료:', { depositId, refundAmount });

    res.json({
      success: true,
      message: '약속금이 환불되었습니다.',
      refundAmount
    });
  } catch (error) {
    console.error('❌ 약속금 환불 실패:', error);
    res.status(500).json({
      success: false,
      error: '환불 처리 중 오류가 발생했습니다.'
    });
  }
};

// 약속금 포인트 전환
exports.convertToPoints = async (req, res) => {
  try {
    const { id: depositId } = req.params;
    const userId = req.user.userId;

    console.log('🎁 약속금 포인트 전환 요청:', { depositId, userId });

    const depositResult = await pool.query(`
      SELECT * FROM promise_deposits
      WHERE id = $1 AND user_id = $2 AND status = 'paid'
    `, [depositId, userId]);

    if (depositResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '포인트 전환 가능한 약속금을 찾을 수 없습니다.'
      });
    }

    const deposit = depositResult.rows[0];
    const pointAmount = deposit.amount;

    // 포인트 적립
    await pool.query(`
      INSERT INTO user_points (user_id, total_points, available_points, used_points, expired_points)
      VALUES ($1, $2, $2, 0, 0)
      ON CONFLICT (user_id)
      DO UPDATE SET
        total_points = user_points.total_points + $2,
        available_points = user_points.available_points + $2,
        updated_at = NOW()
    `, [userId, pointAmount]);

    // 포인트 거래 내역 추가
    await pool.query(`
      INSERT INTO point_transactions (user_id, transaction_type, amount, description, related_meetup_id, created_at)
      VALUES ($1, 'earned', $2, $3, $4, NOW())
    `, [userId, pointAmount, `약속금 포인트 전환 (약속 ID: ${deposit.meetup_id})`, deposit.meetup_id]);

    // 약속금 상태 업데이트
    await pool.query(`
      UPDATE promise_deposits
      SET status = 'converted',
          is_converted_to_points = true,
          updated_at = NOW()
      WHERE id = $1
    `, [depositId]);

    console.log('✅ 약속금 포인트 전환 완료:', { depositId, pointAmount });

    res.json({
      success: true,
      message: '약속금이 포인트로 전환되었습니다.',
      pointAmount
    });
  } catch (error) {
    console.error('❌ 약속금 포인트 전환 실패:', error);
    res.status(500).json({
      success: false,
      error: '포인트 전환 처리 중 오류가 발생했습니다.'
    });
  }
};

// 약속금 일반 환불 (결제 취소)
exports.refundPayment = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { depositId, reason } = req.body;

    console.log('💰 약속금 일반 환불 요청:', { depositId, reason, userId });

    if (!depositId) {
      return res.status(400).json({
        success: false,
        error: '환불할 약속금 정보가 필요합니다.'
      });
    }

    const depositResult = await pool.query(`
      SELECT * FROM promise_deposits
      WHERE id = $1 AND user_id = $2 AND status = 'paid'
    `, [depositId, userId]);

    if (depositResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '환불 가능한 약속금을 찾을 수 없습니다.'
      });
    }

    const deposit = depositResult.rows[0];
    const refundAmount = deposit.amount;

    // 약속금 상태 업데이트
    await pool.query(`
      UPDATE promise_deposits
      SET status = 'refunded',
          refund_amount = $1,
          refund_reason = $2,
          returned_at = NOW(),
          updated_at = NOW()
      WHERE id = $3
    `, [refundAmount, reason || '사용자 요청', depositId]);

    // 포인트로 환불
    await pool.query(`
      INSERT INTO user_points (user_id, total_points, available_points, used_points, expired_points)
      VALUES ($1, $2, $2, 0, 0)
      ON CONFLICT (user_id)
      DO UPDATE SET
        available_points = user_points.available_points + $2,
        updated_at = NOW()
    `, [userId, refundAmount]);

    // 포인트 거래 내역 추가
    await pool.query(`
      INSERT INTO point_transactions (user_id, transaction_type, amount, description, created_at)
      VALUES ($1, 'earned', $2, $3, NOW())
    `, [userId, refundAmount, `약속금 환불 (보증금 ID: ${depositId})`]);

    console.log('✅ 약속금 환불 완료:', { depositId, refundAmount });

    res.json({
      success: true,
      message: '약속금이 환불되었습니다.',
      refundAmount
    });
  } catch (error) {
    console.error('❌ 약속금 환불 실패:', error);
    res.status(500).json({
      success: false,
      error: '환불 처리 중 오류가 발생했습니다.'
    });
  }
};

// ============================================
// 취소 정책 기반 환불 계산
// ============================================

/**
 * 시간 기반 환불율 계산
 * @param {number} minutesBeforeMeetup - 모임 시작까지 남은 시간(분)
 * @param {string} meetupStatus - 모임 상태
 * @returns {Object} { refundRate, cancellationType }
 */
const calculateRefundRate = (minutesBeforeMeetup, meetupStatus) => {
  // 모집중 상태면 언제든 100% 환불
  if (meetupStatus === '모집중') {
    return { refundRate: 100, cancellationType: 'voluntary' };
  }

  // 확정(모집완료) 상태에서의 환불율
  if (minutesBeforeMeetup >= 60) {
    return { refundRate: 100, cancellationType: 'voluntary' };
  } else if (minutesBeforeMeetup >= 40) {
    return { refundRate: 60, cancellationType: 'late_40min' };
  } else if (minutesBeforeMeetup >= 20) {
    return { refundRate: 30, cancellationType: 'late_20min' };
  } else if (minutesBeforeMeetup >= 10) {
    return { refundRate: 0, cancellationType: 'late_10min' };
  } else {
    // 10분 이내는 취소 불가 (노쇼 처리)
    return { refundRate: 0, cancellationType: 'noshow' };
  }
};

/**
 * 환불 금액 계산
 * @param {number} depositAmount - 원래 약속금
 * @param {number} refundRate - 환불율 (%)
 * @returns {Object} { refundAmount, forfeitedAmount }
 */
const calculateRefundAmount = (depositAmount, refundRate) => {
  const refundAmount = Math.floor(depositAmount * refundRate / 100);
  const forfeitedAmount = depositAmount - refundAmount;
  return { refundAmount, forfeitedAmount };
};

// 환불 예상 금액 조회
exports.getRefundPreview = async (req, res) => {
  try {
    const { meetupId } = req.params;
    const userId = req.user.userId;

    // 약속금 정보 조회
    const depositResult = await pool.query(`
      SELECT pd.*, m.date, m.time, m.status as meetup_status
      FROM promise_deposits pd
      JOIN meetups m ON pd.meetup_id = m.id
      WHERE pd.meetup_id = $1 AND pd.user_id = $2 AND pd.status = 'paid'
    `, [meetupId, userId]);

    if (depositResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '약속금 정보를 찾을 수 없습니다.'
      });
    }

    const deposit = depositResult.rows[0];
    const meetupDateTime = new Date(`${deposit.date}T${deposit.time}`);
    const now = new Date();
    const minutesBeforeMeetup = Math.floor((meetupDateTime - now) / (1000 * 60));

    const { refundRate, cancellationType } = calculateRefundRate(minutesBeforeMeetup, deposit.meetup_status);
    const { refundAmount, forfeitedAmount } = calculateRefundAmount(deposit.amount, refundRate);

    res.json({
      success: true,
      preview: {
        originalAmount: deposit.amount,
        refundRate,
        refundAmount,
        forfeitedAmount,
        cancellationType,
        minutesBeforeMeetup,
        canCancel: cancellationType !== 'noshow'
      }
    });
  } catch (error) {
    console.error('❌ 환불 예상 금액 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: '환불 예상 금액 조회 중 오류가 발생했습니다.'
    });
  }
};

// 참가 취소 및 환불 처리 (정책 기반)
exports.cancelParticipationWithRefund = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { meetupId } = req.params;
    const { reason } = req.body;
    const userId = req.user.userId;

    console.log('🚫 참가 취소 요청:', { meetupId, userId, reason });

    // 약속금 및 모임 정보 조회
    const depositResult = await client.query(`
      SELECT pd.*, m.date, m.time, m.status as meetup_status, m.host_id
      FROM promise_deposits pd
      JOIN meetups m ON pd.meetup_id = m.id
      WHERE pd.meetup_id = $1 AND pd.user_id = $2 AND pd.status = 'paid'
    `, [meetupId, userId]);

    if (depositResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: '약속금 정보를 찾을 수 없습니다.'
      });
    }

    const deposit = depositResult.rows[0];
    const meetupDateTime = new Date(`${deposit.date}T${deposit.time}`);
    const now = new Date();
    const minutesBeforeMeetup = Math.floor((meetupDateTime - now) / (1000 * 60));

    // 10분 이내는 취소 불가
    if (minutesBeforeMeetup < 10) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: '약속 시작 10분 이내에는 취소할 수 없습니다. 노쇼 처리됩니다.'
      });
    }

    const { refundRate, cancellationType } = calculateRefundRate(minutesBeforeMeetup, deposit.meetup_status);
    const { refundAmount, forfeitedAmount } = calculateRefundAmount(deposit.amount, refundRate);

    // 1. 약속금 상태 업데이트
    await client.query(`
      UPDATE promise_deposits
      SET status = 'refunded',
          refund_rate = $1,
          refund_amount = $2,
          forfeited_amount = $3,
          cancellation_type = $4,
          refund_reason = $5,
          returned_at = NOW(),
          updated_at = NOW()
      WHERE id = $6
    `, [refundRate, refundAmount, forfeitedAmount, cancellationType, reason, deposit.id]);

    // 2. 환불금이 있으면 포인트로 환불
    if (refundAmount > 0) {
      await client.query(`
        INSERT INTO user_points (user_id, total_points, available_points, used_points, expired_points)
        VALUES ($1, $2, $2, 0, 0)
        ON CONFLICT (user_id)
        DO UPDATE SET
          available_points = user_points.available_points + $2,
          updated_at = NOW()
      `, [userId, refundAmount]);

      await client.query(`
        INSERT INTO point_transactions (user_id, transaction_type, amount, description, created_at)
        VALUES ($1, 'earned', $2, $3, NOW())
      `, [userId, refundAmount, `참가 취소 환불 (${refundRate}%)`]);
    }

    // 3. 몰수금이 있으면 플랫폼 수익으로 기록
    if (forfeitedAmount > 0) {
      await client.query(`
        INSERT INTO platform_revenues (
          meetup_id, user_id, amount, revenue_type, description, created_at
        ) VALUES ($1, $2, $3, 'cancellation_fee', $4, NOW())
      `, [meetupId, userId, forfeitedAmount, `직전 취소 수수료 (${100 - refundRate}%)`]);
    }

    // 4. 취소 이력 기록
    await client.query(`
      INSERT INTO user_cancellation_history (
        user_id, meetup_id, cancellation_type, minutes_before_meetup,
        refund_rate, refund_amount, original_deposit, reason, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    `, [userId, meetupId, cancellationType, minutesBeforeMeetup, refundRate, refundAmount, deposit.amount, reason]);

    // 5. 참가자 상태 업데이트
    await client.query(`
      UPDATE meetup_participants
      SET status = '참가취소', updated_at = NOW()
      WHERE meetup_id = $1 AND user_id = $2
    `, [meetupId, userId]);

    // 6. 참가자 수 감소
    await client.query(`
      UPDATE meetups
      SET current_participants = current_participants - 1, updated_at = NOW()
      WHERE id = $1
    `, [meetupId]);

    // 7. 잦은 취소 체크 및 제재
    await checkAndApplyRestriction(client, userId);

    await client.query('COMMIT');

    console.log('✅ 참가 취소 완료:', {
      meetupId, userId, refundRate, refundAmount, forfeitedAmount, cancellationType
    });

    res.json({
      success: true,
      message: '참가가 취소되었습니다.',
      cancellation: {
        originalAmount: deposit.amount,
        refundRate,
        refundAmount,
        forfeitedAmount,
        cancellationType
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 참가 취소 실패:', error);
    res.status(500).json({
      success: false,
      error: '참가 취소 처리 중 오류가 발생했습니다.'
    });
  } finally {
    client.release();
  }
};

// 잦은 취소 체크 및 제재 적용
const checkAndApplyRestriction = async (client, userId) => {
  // 최근 30일 내 직전 취소 횟수 조회
  const cancelResult = await client.query(`
    SELECT COUNT(*) as cancel_count
    FROM user_cancellation_history
    WHERE user_id = $1
      AND cancellation_type IN ('late_40min', 'late_20min', 'late_10min')
      AND created_at > NOW() - INTERVAL '30 days'
  `, [userId]);

  const cancelCount = parseInt(cancelResult.rows[0].cancel_count);

  if (cancelCount >= 5) {
    // 30일 내 5회 이상 직전 취소 → 7일 이용 제한
    await client.query(`
      INSERT INTO user_restrictions (
        user_id, restriction_type, reason, restricted_until, created_at
      ) VALUES ($1, 'participation', $2, NOW() + INTERVAL '7 days', NOW())
      ON CONFLICT (user_id, restriction_type) DO UPDATE SET
        restricted_until = NOW() + INTERVAL '7 days',
        reason = $2,
        updated_at = NOW()
    `, [userId, `잦은 직전 취소 (30일 내 ${cancelCount}회)`]);

    console.log('⚠️ 이용 제한 적용:', { userId, cancelCount, days: 7 });
  } else if (cancelCount >= 3) {
    // 경고만 기록 (알림 발송은 별도 처리)
    console.log('⚠️ 직전 취소 경고:', { userId, cancelCount });
  }
};

// ============================================
// 노쇼 처리 시스템
// ============================================

// 노쇼 신고
exports.reportNoShow = async (req, res) => {
  try {
    const { meetupId } = req.params;
    const { reportedUserId, isHost } = req.body;
    const reporterId = req.user.userId;

    console.log('🚨 노쇼 신고:', { meetupId, reportedUserId, reporterId, isHost });

    // 같은 모임 참가자인지 확인
    const participantCheck = await pool.query(`
      SELECT mp.user_id, mp.status, m.host_id
      FROM meetup_participants mp
      JOIN meetups m ON mp.meetup_id = m.id
      WHERE mp.meetup_id = $1 AND mp.user_id IN ($2, $3)
    `, [meetupId, reporterId, reportedUserId]);

    if (participantCheck.rows.length < 2) {
      return res.status(400).json({
        success: false,
        error: '같은 약속 참가자만 노쇼 신고할 수 있습니다.'
      });
    }

    // user_reviews에 노쇼 신고 기록 (reported_noshow = true)
    await pool.query(`
      INSERT INTO user_reviews (
        meetup_id, reviewer_id, reviewed_user_id, rating, reported_noshow, created_at, updated_at
      ) VALUES ($1, $2, $3, 1, true, NOW(), NOW())
      ON CONFLICT (meetup_id, reviewer_id, reviewed_user_id) DO UPDATE SET
        reported_noshow = true,
        updated_at = NOW()
    `, [meetupId, reporterId, reportedUserId]);

    console.log('✅ 노쇼 신고 완료');

    res.json({
      success: true,
      message: '노쇼 신고가 접수되었습니다.'
    });
  } catch (error) {
    console.error('❌ 노쇼 신고 실패:', error);
    res.status(500).json({
      success: false,
      error: '노쇼 신고 처리 중 오류가 발생했습니다.'
    });
  }
};

// 노쇼 현황 조회
exports.getNoShowStatus = async (req, res) => {
  try {
    const { meetupId } = req.params;
    const userId = req.user.userId;

    // 권한 확인: 호스트 또는 참가자만 조회 가능
    const authCheck = await pool.query(`
      SELECT 1 FROM meetups m
      LEFT JOIN meetup_participants mp ON mp.meetup_id = m.id AND mp.user_id = $2
      WHERE m.id = $1 AND (m.host_id = $2 OR mp.user_id IS NOT NULL)
    `, [meetupId, userId]);

    if (authCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: '노쇼 현황을 조회할 권한이 없습니다.'
      });
    }

    // GPS 미인증 참가자 + 노쇼 신고 현황
    const statusResult = await pool.query(`
      SELECT
        mp.user_id,
        u.name,
        mp.attended,
        mp.no_show,
        mp.no_show_confirmed,
        COUNT(ur.id) FILTER (WHERE ur.reported_noshow = true) as noshow_reports,
        EXISTS(
          SELECT 1 FROM user_reviews ur2
          JOIN meetup_participants mp2 ON ur2.reviewer_id = mp2.user_id
          JOIN meetups m2 ON mp2.meetup_id = m2.id
          WHERE ur2.meetup_id = $1
            AND ur2.reviewed_user_id = mp.user_id
            AND ur2.reported_noshow = true
            AND mp2.user_id = m2.host_id
        ) as host_reported
      FROM meetup_participants mp
      JOIN users u ON mp.user_id = u.id
      LEFT JOIN user_reviews ur ON ur.meetup_id = mp.meetup_id AND ur.reviewed_user_id = mp.user_id
      WHERE mp.meetup_id = $1 AND mp.status = '참가승인'
      GROUP BY mp.user_id, u.name, mp.attended, mp.no_show, mp.no_show_confirmed
    `, [meetupId]);

    res.json({
      success: true,
      participants: statusResult.rows.map(p => ({
        userId: p.user_id,
        name: p.name,
        attended: p.attended,
        noShow: p.no_show,
        noShowConfirmed: p.no_show_confirmed,
        noShowReports: parseInt(p.noshow_reports),
        hostReported: p.host_reported
      }))
    });
  } catch (error) {
    console.error('❌ 노쇼 현황 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: '노쇼 현황 조회 중 오류가 발생했습니다.'
    });
  }
};

// 노쇼 처리 실행 (관리자 또는 스케줄러)
exports.processNoShow = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { meetupId } = req.params;

    console.log('🔍 노쇼 처리 시작:', { meetupId });

    // 1. GPS 미인증 + 노쇼 신고 2명 이상 또는 호스트 신고인 참가자 조회
    const noShowResult = await client.query(`
      SELECT
        mp.user_id,
        mp.meetup_id,
        pd.id as deposit_id,
        pd.amount as deposit_amount,
        COUNT(ur.id) FILTER (WHERE ur.reported_noshow = true) as noshow_reports,
        EXISTS(
          SELECT 1 FROM user_reviews ur2
          JOIN meetup_participants mp2 ON ur2.reviewer_id = mp2.user_id
          JOIN meetups m2 ON mp2.meetup_id = m2.id
          WHERE ur2.meetup_id = mp.meetup_id
            AND ur2.reviewed_user_id = mp.user_id
            AND ur2.reported_noshow = true
            AND mp2.user_id = m2.host_id
        ) as host_reported
      FROM meetup_participants mp
      JOIN promise_deposits pd ON pd.meetup_id = mp.meetup_id AND pd.user_id = mp.user_id
      LEFT JOIN user_reviews ur ON ur.meetup_id = mp.meetup_id AND ur.reviewed_user_id = mp.user_id
      WHERE mp.meetup_id = $1
        AND mp.status = '참가승인'
        AND mp.attended = false
        AND pd.status = 'paid'
      GROUP BY mp.user_id, mp.meetup_id, pd.id, pd.amount
      HAVING COUNT(ur.id) FILTER (WHERE ur.reported_noshow = true) >= 2
         OR EXISTS(
           SELECT 1 FROM user_reviews ur2
           JOIN meetup_participants mp2 ON ur2.reviewer_id = mp2.user_id
           JOIN meetups m2 ON mp2.meetup_id = m2.id
           WHERE ur2.meetup_id = mp.meetup_id
             AND ur2.reviewed_user_id = mp.user_id
             AND ur2.reported_noshow = true
             AND mp2.user_id = m2.host_id
         )
    `, [meetupId]);

    if (noShowResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.json({
        success: true,
        message: '노쇼 확정 대상이 없습니다.',
        processed: 0
      });
    }

    // 2. 출석한 참가자 목록 (배상 대상)
    const attendedResult = await client.query(`
      SELECT user_id FROM meetup_participants
      WHERE meetup_id = $1 AND status = '참가승인' AND attended = true
    `, [meetupId]);

    const attendedUsers = attendedResult.rows.map(r => r.user_id);
    const processedNoShows = [];

    // 3. 노쇼자별 처리
    for (const noShow of noShowResult.rows) {
      // 3-1. 노쇼 확정
      await client.query(`
        UPDATE meetup_participants
        SET no_show = true, no_show_confirmed = true, updated_at = NOW()
        WHERE meetup_id = $1 AND user_id = $2
      `, [meetupId, noShow.user_id]);

      // 3-2. 약속금 몰수
      const forfeitedAmount = noShow.deposit_amount;
      const victimCompensationTotal = Math.floor(forfeitedAmount * 0.7);
      const platformFee = forfeitedAmount - victimCompensationTotal;

      await client.query(`
        UPDATE promise_deposits
        SET status = 'forfeited',
            forfeited_amount = $1,
            cancellation_type = 'noshow',
            updated_at = NOW()
        WHERE id = $2
      `, [forfeitedAmount, noShow.deposit_id]);

      // 3-3. 피해자 배상 (출석자에게 분배)
      if (attendedUsers.length > 0) {
        const compensationPerPerson = Math.floor(victimCompensationTotal / attendedUsers.length);

        for (const victimId of attendedUsers) {
          // 배상 기록
          await client.query(`
            INSERT INTO noshow_compensations (
              meetup_id, noshow_user_id, victim_user_id,
              deposit_amount, compensation_amount, platform_fee,
              status, paid_at, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, 'paid', NOW(), NOW())
          `, [meetupId, noShow.user_id, victimId, forfeitedAmount, compensationPerPerson, Math.floor(platformFee / attendedUsers.length)]);

          // 포인트 지급
          await client.query(`
            INSERT INTO user_points (user_id, total_points, available_points, used_points, expired_points)
            VALUES ($1, $2, $2, 0, 0)
            ON CONFLICT (user_id)
            DO UPDATE SET
              total_points = user_points.total_points + $2,
              available_points = user_points.available_points + $2,
              updated_at = NOW()
          `, [victimId, compensationPerPerson]);

          await client.query(`
            INSERT INTO point_transactions (user_id, transaction_type, amount, description, created_at)
            VALUES ($1, 'earned', $2, $3, NOW())
          `, [victimId, compensationPerPerson, `노쇼 배상금 (약속 ID: ${meetupId})`]);
        }
      }

      // 3-4. 플랫폼 수익 기록
      await client.query(`
        INSERT INTO platform_revenues (
          meetup_id, user_id, amount, revenue_type, description, created_at
        ) VALUES ($1, $2, $3, 'noshow_fee', '노쇼 수수료 (30%)', NOW())
      `, [meetupId, noShow.user_id, platformFee]);

      // 3-5. 밥알 점수 감소 (-15점)
      await client.query(`
        UPDATE users
        SET babal_score = GREATEST(0, babal_score - 15), updated_at = NOW()
        WHERE id = $1
      `, [noShow.user_id]);

      // 3-6. 취소 이력에 노쇼 기록
      await client.query(`
        INSERT INTO user_cancellation_history (
          user_id, meetup_id, cancellation_type, refund_rate,
          refund_amount, original_deposit, reason, created_at
        ) VALUES ($1, $2, 'noshow', 0, 0, $3, '노쇼 확정', NOW())
      `, [noShow.user_id, meetupId, forfeitedAmount]);

      // 3-7. 누적 노쇼 체크 및 제재
      await checkNoShowRestriction(client, noShow.user_id);

      processedNoShows.push({
        userId: noShow.user_id,
        forfeitedAmount,
        compensationPerPerson: attendedUsers.length > 0 ? Math.floor(victimCompensationTotal / attendedUsers.length) : 0,
        platformFee
      });
    }

    await client.query('COMMIT');

    console.log('✅ 노쇼 처리 완료:', { meetupId, processedCount: processedNoShows.length });

    res.json({
      success: true,
      message: '노쇼 처리가 완료되었습니다.',
      processed: processedNoShows.length,
      details: processedNoShows
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 노쇼 처리 실패:', error);
    res.status(500).json({
      success: false,
      error: '노쇼 처리 중 오류가 발생했습니다.'
    });
  } finally {
    client.release();
  }
};

// 누적 노쇼 체크 및 제재 적용
const checkNoShowRestriction = async (client, userId) => {
  const noShowResult = await client.query(`
    SELECT COUNT(*) as noshow_count
    FROM user_cancellation_history
    WHERE user_id = $1 AND cancellation_type = 'noshow'
  `, [userId]);

  const noShowCount = parseInt(noShowResult.rows[0].noshow_count);
  let restrictionDays = 0;
  let restrictionType = 'participation';

  if (noShowCount >= 10) {
    restrictionDays = 36500; // 영구 (100년)
    restrictionType = 'permanent';
  } else if (noShowCount >= 5) {
    restrictionDays = 30;
  } else if (noShowCount >= 3) {
    restrictionDays = 7;
  }

  if (restrictionDays > 0) {
    const reason = `누적 노쇼 ${noShowCount}회`;
    // 안전한 파라미터화 쿼리 - restrictionDays를 make_interval 함수로 처리
    await client.query(`
      INSERT INTO user_restrictions (
        user_id, restriction_type, reason, restricted_until, created_at
      ) VALUES ($1, $2, $3, NOW() + make_interval(days => $4), NOW())
      ON CONFLICT (user_id, restriction_type) DO UPDATE SET
        restricted_until = NOW() + make_interval(days => $4),
        reason = $3,
        updated_at = NOW()
    `, [userId, restrictionType, reason, restrictionDays]);

    console.log('⚠️ 노쇼 제재 적용:', { userId, noShowCount, restrictionDays });
  }
};

// ============================================
// 배상금 관련
// ============================================

// 내 배상금 내역 조회
exports.getMyCompensations = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(`
      SELECT
        nc.*,
        m.title as meetup_title,
        m.date as meetup_date,
        u.name as noshow_user_nickname
      FROM noshow_compensations nc
      JOIN meetups m ON nc.meetup_id = m.id
      JOIN users u ON nc.noshow_user_id = u.id
      WHERE nc.victim_user_id = $1
      ORDER BY nc.created_at DESC
    `, [userId]);

    res.json({
      success: true,
      compensations: result.rows.map(c => ({
        id: c.id,
        meetupId: c.meetup_id,
        meetupTitle: c.meetup_title,
        meetupDate: c.meetup_date,
        noshowUserNickname: c.noshow_user_nickname,
        depositAmount: c.deposit_amount,
        compensationAmount: c.compensation_amount,
        status: c.status,
        paidAt: c.paid_at,
        createdAt: c.created_at
      }))
    });
  } catch (error) {
    console.error('❌ 배상금 내역 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: '배상금 내역 조회 중 오류가 발생했습니다.'
    });
  }
};

// 노쇼 이의 신청
exports.appealNoShow = async (req, res) => {
  try {
    const { meetupId, reason, evidence } = req.body;
    const userId = req.user.userId;

    // 노쇼 확정 여부 확인
    const noShowCheck = await pool.query(`
      SELECT * FROM meetup_participants
      WHERE meetup_id = $1 AND user_id = $2 AND no_show_confirmed = true
    `, [meetupId, userId]);

    if (noShowCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: '노쇼 이의 신청 대상이 아닙니다.'
      });
    }

    // 이의 신청 기록 (support_tickets 테이블 활용)
    await pool.query(`
      INSERT INTO support_tickets (
        user_id, type, title, content, status, priority, created_at
      ) VALUES ($1, 'noshow_appeal', $2, $3, 'pending', 'high', NOW())
    `, [userId, `노쇼 이의 신청 - 약속 ${meetupId}`, JSON.stringify({ meetupId, reason, evidence })]);

    res.json({
      success: true,
      message: '노쇼 이의 신청이 접수되었습니다. 검토 후 안내드리겠습니다.'
    });
  } catch (error) {
    console.error('❌ 노쇼 이의 신청 실패:', error);
    res.status(500).json({
      success: false,
      error: '이의 신청 처리 중 오류가 발생했습니다.'
    });
  }
};

// 내 취소 이력 조회
exports.getMyCancellationHistory = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(`
      SELECT
        uch.*,
        m.title as meetup_title,
        m.date as meetup_date
      FROM user_cancellation_history uch
      JOIN meetups m ON uch.meetup_id = m.id
      WHERE uch.user_id = $1
      ORDER BY uch.created_at DESC
    `, [userId]);

    res.json({
      success: true,
      history: result.rows.map(h => ({
        id: h.id,
        meetupId: h.meetup_id,
        meetupTitle: h.meetup_title,
        meetupDate: h.meetup_date,
        cancellationType: h.cancellation_type,
        minutesBeforeMeetup: h.minutes_before_meetup,
        refundRate: h.refund_rate,
        refundAmount: h.refund_amount,
        originalDeposit: h.original_deposit,
        reason: h.reason,
        createdAt: h.created_at
      }))
    });
  } catch (error) {
    console.error('❌ 취소 이력 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: '취소 이력 조회 중 오류가 발생했습니다.'
    });
  }
};

// 내 제재 현황 조회
exports.getMyRestrictions = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(`
      SELECT * FROM user_restrictions
      WHERE user_id = $1 AND restricted_until > NOW()
      ORDER BY restricted_until DESC
    `, [userId]);

    res.json({
      success: true,
      restrictions: result.rows.map(r => ({
        id: r.id,
        restrictionType: r.restriction_type,
        reason: r.reason,
        restrictedUntil: r.restricted_until,
        createdAt: r.created_at
      })),
      isRestricted: result.rows.length > 0
    });
  } catch (error) {
    console.error('❌ 제재 현황 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: '제재 현황 조회 중 오류가 발생했습니다.'
    });
  }
};
