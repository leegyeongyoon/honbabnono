const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserNotificationSetting = sequelize.define('UserNotificationSetting', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    field: 'user_id'
  },
  pushNotifications: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'push_notifications'
  },
  emailNotifications: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'email_notifications'
  },
  meetupReminders: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'meetup_reminders'
  },
  chatNotifications: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'chat_notifications'
  },
  marketingNotifications: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'marketing_notifications'
  }
}, {
  tableName: 'user_notification_settings',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user_id'] }
  ]
});

module.exports = UserNotificationSetting;