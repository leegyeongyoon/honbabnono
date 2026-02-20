const pool = require('../../config/database');

// 포인트 조회
exports.getPoints = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(`
      SELECT
        COALESCE(available_points, 0) as available_points,
        COALESCE(total_earned, 0) as total_earned,
        COALESCE(total_used, 0) as total_used
      FROM user_points
      WHERE user_id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      // 포인트 레코드 생성
      await pool.query(`
        INSERT INTO user_points (user_id, available_points, total_earned, total_used)
        VALUES ($1, 0, 0, 0)
      `, [userId]);

      return res.json({
        success: true,
        points: {
          available: 0,
          totalEarned: 0,
          totalUsed: 0
        }
      });
    }

    res.json({
      success: true,
      points: {
        available: result.rows[0].available_points,
        totalEarned: result.rows[0].total_earned,
        totalUsed: result.rows[0].total_used
      }
    });

  } catch (error) {
    console.error('포인트 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 포인트 내역 조회
exports.getPointHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20, type } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE user_id = $1';
    const params = [userId, parseInt(limit), offset];

    if (type) {
      whereClause += ' AND transaction_type = $4';
      params.push(type);
    }

    const result = await pool.query(`
      SELECT *
      FROM point_transactions
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, params);

    res.json({
      success: true,
      history: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.rowCount
      }
    });

  } catch (error) {
    console.error('포인트 내역 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 포인트 적립
exports.earnPoints = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount, reason, relatedMeetupId } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 포인트 증가
      await client.query(`
        INSERT INTO user_points (user_id, available_points, total_earned)
        VALUES ($1, $2, $2)
        ON CONFLICT (user_id)
        DO UPDATE SET
          available_points = user_points.available_points + $2,
          total_earned = user_points.total_earned + $2
      `, [userId, amount]);

      // 거래 내역 기록
      await client.query(`
        INSERT INTO point_transactions (user_id, transaction_type, amount, description, related_meetup_id, created_at)
        VALUES ($1, 'earn', $2, $3, $4, NOW())
      `, [userId, amount, reason, relatedMeetupId]);

      await client.query('COMMIT');

      res.json({
        success: true,
        message: `${amount} 포인트가 적립되었습니다.`
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('포인트 적립 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 포인트 사용
exports.usePoints = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount, reason, relatedMeetupId } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 잔액 확인
      const balanceResult = await client.query(
        'SELECT available_points FROM user_points WHERE user_id = $1',
        [userId]
      );

      if (balanceResult.rows.length === 0 || balanceResult.rows[0].available_points < amount) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: '포인트 잔액이 부족합니다.'
        });
      }

      // 포인트 감소
      await client.query(`
        UPDATE user_points
        SET available_points = available_points - $2,
            total_used = total_used + $2
        WHERE user_id = $1
      `, [userId, amount]);

      // 거래 내역 기록
      await client.query(`
        INSERT INTO point_transactions (user_id, transaction_type, amount, description, related_meetup_id, created_at)
        VALUES ($1, 'use', $2, $3, $4, NOW())
      `, [userId, amount, reason, relatedMeetupId]);

      await client.query('COMMIT');

      res.json({
        success: true,
        message: `${amount} 포인트가 사용되었습니다.`
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('포인트 사용 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 약속금 결제
exports.payDeposit = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { meetupId, amount } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 잔액 확인
      const balanceResult = await client.query(
        'SELECT available_points FROM user_points WHERE user_id = $1',
        [userId]
      );

      if (balanceResult.rows.length === 0 || balanceResult.rows[0].available_points < amount) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: '포인트 잔액이 부족합니다.'
        });
      }

      // 포인트 차감
      await client.query(`
        UPDATE user_points
        SET available_points = available_points - $2
        WHERE user_id = $1
      `, [userId, amount]);

      // 약속금 기록
      await client.query(`
        INSERT INTO promise_deposits (meetup_id, user_id, amount, status, paid_at, created_at)
        VALUES ($1, $2, $3, 'paid', NOW(), NOW())
      `, [meetupId, userId, amount]);

      await client.query('COMMIT');

      res.json({
        success: true,
        message: '약속금이 결제되었습니다.'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('약속금 결제 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 약속금 환불
exports.refundDeposit = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { meetupId } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 약속금 확인
      const depositResult = await client.query(`
        SELECT amount FROM promise_deposits
        WHERE meetup_id = $1 AND user_id = $2 AND status = 'paid'
      `, [meetupId, userId]);

      if (depositResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: '환불할 약속금이 없습니다.'
        });
      }

      const amount = depositResult.rows[0].amount;

      // 포인트 환불
      await client.query(`
        UPDATE user_points
        SET available_points = available_points + $2
        WHERE user_id = $1
      `, [userId, amount]);

      // 약속금 상태 변경
      await client.query(`
        UPDATE promise_deposits
        SET status = 'refunded', refunded_at = NOW()
        WHERE meetup_id = $1 AND user_id = $2
      `, [meetupId, userId]);

      await client.query('COMMIT');

      res.json({
        success: true,
        message: `${amount} 포인트가 환불되었습니다.`
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('약속금 환불 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};
