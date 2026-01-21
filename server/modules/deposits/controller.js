const pool = require('../../config/database');

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
          gen_random_uuid(), '임시 모임 (결제 진행 중)', '모임 생성 진행 중', '미정',
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
          error: '이미 해당 모임의 약속금을 결제하셨습니다.'
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
          ? '모임 약속금 결제 (임시 결제)'
          : `모임 약속금 결제 (모임 ID: ${meetupId})`;
        await pool.query(`
          INSERT INTO point_transactions (user_id, type, amount, description, created_at)
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
      INSERT INTO point_transactions (user_id, type, amount, description, created_at)
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
      INSERT INTO point_transactions (user_id, type, amount, description, related_deposit_id, created_at)
      VALUES ($1, 'earned', $2, $3, $4, NOW())
    `, [userId, pointAmount, `약속금 포인트 전환 (모임 ID: ${deposit.meetup_id})`, depositId]);

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
      INSERT INTO point_transactions (user_id, type, amount, description, created_at)
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
