const pool = require('../../config/database');

// 알림 목록 조회
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20, type } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE user_id = $1';
    const params = [userId, parseInt(limit), offset];

    if (type) {
      whereClause += ' AND type = $4';
      params.push(type);
    }

    const result = await pool.query(`
      SELECT *
      FROM notifications
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, params);

    res.json({
      success: true,
      notifications: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.rowCount
      }
    });

  } catch (error) {
    console.error('알림 목록 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 읽지 않은 알림 수
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    res.json({
      success: true,
      unreadCount: parseInt(result.rows[0].count)
    });

  } catch (error) {
    console.error('읽지 않은 알림 수 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 알림 읽음 처리
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    await pool.query(
      'UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    res.json({
      success: true,
      message: '알림을 읽음 처리했습니다.'
    });

  } catch (error) {
    console.error('알림 읽음 처리 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 모든 알림 읽음 처리
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;

    await pool.query(
      'UPDATE notifications SET is_read = true, read_at = NOW() WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    res.json({
      success: true,
      message: '모든 알림을 읽음 처리했습니다.'
    });

  } catch (error) {
    console.error('모든 알림 읽음 처리 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 알림 삭제
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    res.json({
      success: true,
      message: '알림이 삭제되었습니다.'
    });

  } catch (error) {
    console.error('알림 삭제 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 알림 설정 조회
exports.getSettings = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      'SELECT * FROM notification_settings WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      // 기본 설정 반환
      return res.json({
        success: true,
        settings: {
          pushEnabled: true,
          chatEnabled: true,
          meetupEnabled: true,
          marketingEnabled: false
        }
      });
    }

    res.json({
      success: true,
      settings: result.rows[0]
    });

  } catch (error) {
    console.error('알림 설정 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 알림 설정 변경
exports.updateSettings = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { pushEnabled, chatEnabled, meetupEnabled, marketingEnabled } = req.body;

    await pool.query(`
      INSERT INTO notification_settings (user_id, push_enabled, chat_enabled, meetup_enabled, marketing_enabled)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id)
      DO UPDATE SET
        push_enabled = $2,
        chat_enabled = $3,
        meetup_enabled = $4,
        marketing_enabled = $5,
        updated_at = NOW()
    `, [userId, pushEnabled, chatEnabled, meetupEnabled, marketingEnabled]);

    res.json({
      success: true,
      message: '알림 설정이 변경되었습니다.'
    });

  } catch (error) {
    console.error('알림 설정 변경 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 알림 생성 함수 (내부용)
exports.createNotification = async (userId, type, title, content, data = {}) => {
  try {
    await pool.query(`
      INSERT INTO notifications (user_id, type, title, content, data, is_read, created_at)
      VALUES ($1, $2, $3, $4, $5, false, NOW())
    `, [userId, type, title, content, JSON.stringify(data)]);
  } catch (error) {
    console.error('알림 생성 오류:', error);
  }
};

// 테스트 알림 생성
exports.createTestNotification = async (req, res) => {
  try {
    const userId = req.user.userId;

    await pool.query(`
      INSERT INTO notifications (user_id, type, title, message, data, created_at, updated_at)
      VALUES ($1, 'system_announcement', '🎉 테스트 알림', '알림 시스템이 정상적으로 작동하고 있습니다!', '{"testData":"This is a test notification"}', NOW(), NOW())
    `, [userId]);

    res.json({ success: true, message: '테스트 알림이 생성되었습니다.' });
  } catch (error) {
    console.error('테스트 알림 생성 오류:', error);
    res.status(500).json({ error: '테스트 알림 생성에 실패했습니다.' });
  }
};

// PATCH 버전 알림 읽음 처리
exports.markAsReadPatch = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.userId;

    await pool.query(
      'UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );

    res.json({
      success: true,
      message: '알림을 읽음 처리했습니다.'
    });

  } catch (error) {
    console.error('알림 읽음 처리 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};
