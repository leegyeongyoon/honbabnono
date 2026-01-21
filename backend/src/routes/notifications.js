const express = require('express');
const { Notification, UserNotificationSetting, User, Meetup } = require('../models');
const authenticateToken = require('../middleware/auth');
const { Op } = require('sequelize');
const NotificationService = require('../services/notificationService');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const userId = req.user.userId;

    const whereClause = { userId };
    if (unreadOnly === 'true') {
      whereClause.isRead = false;
    }

    const notifications = await Notification.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Meetup,
          as: 'meetup',
          attributes: ['id', 'title', 'location']
        },
        {
          model: User,
          as: 'relatedUser',
          attributes: ['id', 'name', 'profileImage']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (page - 1) * limit
    });

    res.json({
      notifications: notifications.rows,
      pagination: {
        total: notifications.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(notifications.count / limit)
      }
    });
  } catch (error) {
    console.error('알림 조회 오류:', error);
    res.status(500).json({ error: '알림을 불러오는데 실패했습니다.' });
  }
});

router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const unreadCount = await Notification.count({
      where: {
        userId,
        isRead: false
      }
    });

    res.json({ unreadCount });
  } catch (error) {
    console.error('읽지 않은 알림 개수 조회 오류:', error);
    res.status(500).json({ error: '읽지 않은 알림 개수를 불러오는데 실패했습니다.' });
  }
});

router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const notification = await Notification.findOne({
      where: { id, userId }
    });

    if (!notification) {
      return res.status(404).json({ error: '알림을 찾을 수 없습니다.' });
    }

    await notification.update({ isRead: true });

    res.json({ message: '알림을 읽음으로 표시했습니다.' });
  } catch (error) {
    console.error('알림 읽음 처리 오류:', error);
    res.status(500).json({ error: '알림 읽음 처리에 실패했습니다.' });
  }
});

router.put('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    await Notification.update(
      { isRead: true },
      { where: { userId, isRead: false } }
    );

    res.json({ message: '모든 알림을 읽음으로 표시했습니다.' });
  } catch (error) {
    console.error('모든 알림 읽음 처리 오류:', error);
    res.status(500).json({ error: '모든 알림 읽음 처리에 실패했습니다.' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const notification = await Notification.findOne({
      where: { id, userId }
    });

    if (!notification) {
      return res.status(404).json({ error: '알림을 찾을 수 없습니다.' });
    }

    await notification.destroy();

    res.json({ message: '알림을 삭제했습니다.' });
  } catch (error) {
    console.error('알림 삭제 오류:', error);
    res.status(500).json({ error: '알림 삭제에 실패했습니다.' });
  }
});

router.get('/settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    let settings = await UserNotificationSetting.findOne({
      where: { userId }
    });

    if (!settings) {
      settings = await UserNotificationSetting.create({
        userId,
        pushNotifications: true,
        emailNotifications: true,
        meetupReminders: true,
        chatNotifications: true,
        marketingNotifications: false
      });
    }

    res.json(settings);
  } catch (error) {
    console.error('알림 설정 조회 오류:', error);
    res.status(500).json({ error: '알림 설정을 불러오는데 실패했습니다.' });
  }
});

router.put('/settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      pushNotifications,
      emailNotifications,
      meetupReminders,
      chatNotifications,
      marketingNotifications
    } = req.body;

    let settings = await UserNotificationSetting.findOne({
      where: { userId }
    });

    if (!settings) {
      settings = await UserNotificationSetting.create({
        userId,
        pushNotifications: pushNotifications ?? true,
        emailNotifications: emailNotifications ?? true,
        meetupReminders: meetupReminders ?? true,
        chatNotifications: chatNotifications ?? true,
        marketingNotifications: marketingNotifications ?? false
      });
    } else {
      await settings.update({
        pushNotifications: pushNotifications ?? settings.pushNotifications,
        emailNotifications: emailNotifications ?? settings.emailNotifications,
        meetupReminders: meetupReminders ?? settings.meetupReminders,
        chatNotifications: chatNotifications ?? settings.chatNotifications,
        marketingNotifications: marketingNotifications ?? settings.marketingNotifications
      });
    }

    res.json(settings);
  } catch (error) {
    console.error('알림 설정 업데이트 오류:', error);
    res.status(500).json({ error: '알림 설정 업데이트에 실패했습니다.' });
  }
});

// 테스트 알림 생성 엔드포인트
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    await NotificationService.createNotification({
      userId: userId,
      type: 'system_announcement',
      title: '🎉 테스트 알림',
      message: '알림 시스템이 정상적으로 작동하고 있습니다!',
      data: {
        testData: 'This is a test notification'
      }
    });

    res.json({ success: true, message: '테스트 알림이 생성되었습니다.' });
  } catch (error) {
    console.error('테스트 알림 생성 오류:', error);
    res.status(500).json({ error: '테스트 알림 생성에 실패했습니다.' });
  }
});

module.exports = router;