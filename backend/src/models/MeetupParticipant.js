const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MeetupParticipant = sequelize.define('MeetupParticipant', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  meetupId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'meetups',
      key: 'id'
    },
    field: 'meetup_id'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'user_id'
  },
  status: {
    type: DataTypes.ENUM('참가신청', '참가승인', '참가거절', '참가취소'),
    defaultValue: '참가신청'
  },
  joinedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'joined_at'
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: true // 참가 신청 메시지
  }
}, {
  tableName: 'meetup_participants',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['meetup_id', 'user_id']
    }
  ]
});

module.exports = MeetupParticipant;