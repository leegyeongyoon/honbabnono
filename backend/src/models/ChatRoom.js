const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ChatRoom = sequelize.define('ChatRoom', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  type: {
    type: DataTypes.ENUM('meetup', 'direct'),
    allowNull: false
  },
  meetupId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: '모임 ID (모임 채팅방인 경우)',
    references: {
      model: 'meetups',
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '채팅방 제목'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '채팅방 설명'
  },
  lastMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '마지막 메시지'
  },
  lastMessageTime: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '마지막 메시지 시간'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '활성 상태'
  },
  maxParticipants: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '최대 참가자 수 (모임 채팅방인 경우)'
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: '생성자 ID',
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'chat_rooms',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  indexes: [
    {
      name: 'idx_chat_rooms_type',
      fields: ['type']
    },
    {
      name: 'idx_chat_rooms_meetup_id',
      fields: ['meetupId']
    },
    {
      name: 'idx_chat_rooms_created_by',
      fields: ['createdBy']
    }
  ]
});

module.exports = ChatRoom;