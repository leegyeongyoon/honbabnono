const { Notification, UserNotificationSetting, User, Meetup } = require('../models');
const { Op } = require('sequelize');

class NotificationService {
  static async createNotification({
    userId,
    type,
    title,
    message,
    meetupId = null,
    relatedUserId = null,
    data = {},
    scheduledAt = null
  }) {
    try {
      const notification = await Notification.create({
        userId,
        type,
        title,
        message,
        meetupId,
        relatedUserId,
        data,
        scheduledAt: scheduledAt || new Date(),
        isRead: false,
        isSent: !scheduledAt
      });

      if (!scheduledAt) {
        this.sendRealTimeNotification(notification);
      }

      return notification;
    } catch (error) {
      console.error('알림 생성 오류:', error);
      throw error;
    }
  }

  static async createMeetupJoinNotification(meetupId, userId, requesterUserId) {
    const meetup = await Meetup.findByPk(meetupId, { attributes: ['title', 'hostId'] });
    const requester = await User.findByPk(requesterUserId, { attributes: ['name'] });

    if (meetup && requester) {
      await this.createNotification({
        userId: meetup.hostId,
        type: 'meetup_join_request',
        title: '모임 참가 신청',
        message: `${requester.name}님이 "${meetup.title}" 모임에 참가를 신청했습니다.`,
        meetupId,
        relatedUserId: requesterUserId
      });
    }
  }

  static async createMeetupApprovalNotification(meetupId, userId, approved) {
    const meetup = await Meetup.findByPk(meetupId, { attributes: ['title'] });

    if (meetup) {
      const type = approved ? 'meetup_join_approved' : 'meetup_join_rejected';
      const title = approved ? '모임 참가 승인' : '모임 참가 거절';
      const message = approved 
        ? `"${meetup.title}" 모임 참가가 승인되었습니다.`
        : `"${meetup.title}" 모임 참가가 거절되었습니다.`;

      await this.createNotification({
        userId,
        type,
        title,
        message,
        meetupId
      });
    }
  }

  static async createChatMessageNotification(chatRoomId, senderId, recipientId, messageContent) {
    const sender = await User.findByPk(senderId, { attributes: ['name'] });
    
    if (sender) {
      await this.createNotification({
        userId: recipientId,
        type: 'chat_message',
        title: '새 메시지',
        message: `${sender.name}님이 메시지를 보냈습니다: ${messageContent.substring(0, 50)}${messageContent.length > 50 ? '...' : ''}`,
        relatedUserId: senderId,
        data: { chatRoomId }
      });
    }
  }

  static async createMeetupReminderNotification(meetupId, userId, reminderMinutes) {
    const meetup = await Meetup.findByPk(meetupId, { attributes: ['title', 'startDate'] });
    
    if (meetup) {
      const scheduledAt = new Date(meetup.startDate.getTime() - (reminderMinutes * 60 * 1000));
      
      await this.createNotification({
        userId,
        type: 'meetup_reminder',
        title: '모임 리마인더',
        message: `"${meetup.title}" 모임이 ${reminderMinutes}분 후 시작됩니다.`,
        meetupId,
        scheduledAt: scheduledAt > new Date() ? scheduledAt : new Date()
      });
    }
  }

  static async createAttendanceCheckNotification(meetupId, userId) {
    const meetup = await Meetup.findByPk(meetupId, { attributes: ['title'] });
    
    if (meetup) {
      await this.createNotification({
        userId,
        type: 'attendance_check',
        title: '출석 체크',
        message: `"${meetup.title}" 모임 출석을 확인해주세요.`,
        meetupId
      });
    }
  }

  static async createDirectChatRequestNotification(requesterId, recipientId) {
    const requester = await User.findByPk(requesterId, { attributes: ['name'] });
    
    if (requester) {
      await this.createNotification({
        userId: recipientId,
        type: 'direct_chat_request',
        title: '1대1 채팅 요청',
        message: `${requester.name}님이 1대1 채팅을 요청했습니다.`,
        relatedUserId: requesterId
      });
    }
  }

  static async createSystemAnnouncementNotification(title, message, targetUserIds = null) {
    const userIds = targetUserIds || await User.findAll({
      attributes: ['id'],
      raw: true
    }).then(users => users.map(u => u.id));

    const notifications = userIds.map(userId => ({
      userId,
      type: 'system_announcement',
      title,
      message,
      isRead: false,
      isSent: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    await Notification.bulkCreate(notifications);
  }

  static async createPaymentNotification(userId, success, amount, description) {
    const type = success ? 'payment_success' : 'payment_failed';
    const title = success ? '결제 완료' : '결제 실패';
    const message = success 
      ? `${amount.toLocaleString()}원 결제가 완료되었습니다. ${description}`
      : `${amount.toLocaleString()}원 결제에 실패했습니다. ${description}`;

    await this.createNotification({
      userId,
      type,
      title,
      message,
      data: { amount, description }
    });
  }

  static async sendRealTimeNotification(notification) {
    try {
      // WebSocket을 통한 실시간 알림 전송
      const io = global.io || require('../server').io;
      
      if (io) {
        // 해당 사용자에게만 알림 전송 (사용자별 room 사용)
        io.to(`user_${notification.userId}`).emit('new_notification', {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          createdAt: notification.createdAt,
          isRead: notification.isRead
        });
        
        console.log(`실시간 알림 전송 성공: ${notification.title} -> user_${notification.userId}`);
      } else {
        console.log('WebSocket 서버를 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('실시간 알림 전송 실패:', error);
    }
  }

  static async processScheduledNotifications() {
    const scheduledNotifications = await Notification.findAll({
      where: {
        isSent: false,
        scheduledAt: {
          [Op.lte]: new Date()
        }
      }
    });

    for (const notification of scheduledNotifications) {
      await notification.update({ isSent: true, sentAt: new Date() });
      this.sendRealTimeNotification(notification);
    }
  }

  static async getUserNotificationSettings(userId) {
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

    return settings;
  }

  static async shouldSendNotification(userId, notificationType) {
    const settings = await this.getUserNotificationSettings(userId);

    const typeMapping = {
      'chat_message': 'chatNotifications',
      'meetup_reminder': 'meetupReminders',
      'meetup_start': 'meetupReminders',
      'attendance_check': 'meetupReminders',
      'system_announcement': 'pushNotifications',
      'app_update': 'pushNotifications',
      'marketing': 'marketingNotifications'
    };

    const settingField = typeMapping[notificationType] || 'pushNotifications';
    return settings[settingField];
  }
}

module.exports = NotificationService;