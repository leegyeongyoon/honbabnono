const pool = require('../../config/database');
const logger = require('../../config/logger');
const pushService = require('./pushService');

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
    logger.error('알림 목록 조회 오류:', error);
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
    logger.error('읽지 않은 알림 수 조회 오류:', error);
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
    logger.error('알림 읽음 처리 오류:', error);
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
    logger.error('모든 알림 읽음 처리 오류:', error);
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
    logger.error('알림 삭제 오류:', error);
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
    logger.error('알림 설정 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 알림 설정 변경
exports.updateSettings = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { pushEnabled, chatMessages, meetupReminders, systemAnnouncements } = req.body;

    await pool.query(`
      INSERT INTO user_notification_settings (user_id, push_enabled, chat_messages, meetup_reminders, system_announcements)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id)
      DO UPDATE SET
        push_enabled = COALESCE($2, user_notification_settings.push_enabled),
        chat_messages = COALESCE($3, user_notification_settings.chat_messages),
        meetup_reminders = COALESCE($4, user_notification_settings.meetup_reminders),
        system_announcements = COALESCE($5, user_notification_settings.system_announcements),
        updated_at = NOW()
    `, [userId, pushEnabled, chatMessages, meetupReminders, systemAnnouncements]);

    res.json({
      success: true,
      message: '알림 설정이 변경되었습니다.'
    });

  } catch (error) {
    logger.error('알림 설정 변경 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 알림 생성 함수 (내부용)
exports.createNotification = async (userId, type, title, message, data = {}) => {
  try {
    const meetupId = data.meetupId || data.meetup_id || null;
    const relatedUserId = data.relatedUserId || data.related_user_id || null;
    await pool.query(`
      INSERT INTO notifications (user_id, type, title, message, meetup_id, related_user_id, data, is_read, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, false, NOW())
    `, [userId, type, title, message, meetupId, relatedUserId, JSON.stringify(data)]);

    // 푸시 알림 전송 (비동기, 실패해도 DB 알림은 유지)
    pushService.sendPushNotification(userId, title, message, { type, ...data })
      .catch(err => logger.error('푸시 알림 전송 실패:', err));
  } catch (error) {
    logger.error('알림 생성 오류:', error);
  }
};

// 테스트 알림 생성
exports.createTestNotification = async (req, res) => {
  try {
    const userId = req.user.userId;

    await pool.query(`
      INSERT INTO notifications (user_id, type, title, message, data, is_read, created_at)
      VALUES ($1, 'system_announcement', '🎉 테스트 알림', '알림 시스템이 정상적으로 작동하고 있습니다!', '{"testData":"This is a test notification"}', false, NOW())
    `, [userId]);

    // 푸시 알림도 함께 전송
    const pushResult = await pushService.sendPushNotification(
      userId,
      '🎉 테스트 알림',
      '알림 시스템이 정상적으로 작동하고 있습니다!',
      { type: 'system_announcement', testData: 'This is a test notification' }
    );

    res.json({
      success: true,
      message: '테스트 알림이 생성되었습니다.',
      push: pushResult
    });
  } catch (error) {
    logger.error('테스트 알림 생성 오류:', error);
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
    logger.error('알림 읽음 처리 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 디바이스 FCM 토큰 등록
exports.registerToken = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { token, platform } = req.body;

    if (!token) {
      return res.status(400).json({ error: '디바이스 토큰이 필요합니다.' });
    }

    if (platform && !['ios', 'android'].includes(platform)) {
      return res.status(400).json({ error: '플랫폼은 ios 또는 android만 가능합니다.' });
    }

    const result = await pushService.registerDeviceToken(userId, token, platform || 'ios');

    if (result.success) {
      res.json({
        success: true,
        message: '디바이스 토큰이 등록되었습니다.'
      });
    } else {
      res.status(500).json({ error: '디바이스 토큰 등록에 실패했습니다.' });
    }
  } catch (error) {
    logger.error('디바이스 토큰 등록 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};

// 디바이스 FCM 토큰 해제
exports.unregisterToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: '디바이스 토큰이 필요합니다.' });
    }

    const result = await pushService.removeDeviceToken(token);

    if (result.success) {
      res.json({
        success: true,
        message: '디바이스 토큰이 해제되었습니다.'
      });
    } else {
      res.status(500).json({ error: '디바이스 토큰 해제에 실패했습니다.' });
    }
  } catch (error) {
    logger.error('디바이스 토큰 해제 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
};
