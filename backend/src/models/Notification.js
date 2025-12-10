const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id'
  },
  type: {
    type: DataTypes.ENUM(
      'meetup_start',
      'meetup_reminder', 
      'attendance_check',
      'chat_message',
      'review_request',
      'point_penalty',
      'point_refund',
      'meetup_join_request',
      'meetup_join_approved',
      'meetup_join_rejected',
      'meetup_cancelled',
      'meetup_updated',
      'new_chat_room',
      'direct_chat_request',
      'system_announcement',
      'app_update',
      'safety_check',
      'payment_success',
      'payment_failed',
      'weekly_summary'
    ),
    allowNull: false
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  meetupId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'meetup_id'
  },
  relatedUserId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'related_user_id'
  },
  data: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_read'
  },
  isSent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_sent'
  },
  scheduledAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'scheduled_at'
  },
  sentAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'sent_at'
  }
}, {
  tableName: 'notifications',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['type'] },
    { fields: ['is_read'] },
    { fields: ['scheduled_at'] }
  ]
});

module.exports = Notification;