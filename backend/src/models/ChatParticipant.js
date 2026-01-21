const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ChatParticipant = sequelize.define('ChatParticipant', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  chatRoomId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '채팅방 ID',
    references: {
      model: 'chat_rooms',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: '사용자 ID',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  userName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '사용자 이름'
  },
  role: {
    type: DataTypes.ENUM('owner', 'admin', 'member'),
    defaultValue: 'member',
    comment: '채팅방 내 역할'
  },
  joinedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: '참가 시간'
  },
  leftAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '퇴장 시간'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '활성 상태'
  },
  lastReadMessageId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '마지막으로 읽은 메시지 ID',
    references: {
      model: 'chat_messages',
      key: 'id'
    }
  },
  lastReadAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '마지막 읽기 시간'
  },
  unreadCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '읽지 않은 메시지 수'
  },
  isMuted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '알림 음소거 여부'
  },
  isPinned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '채팅방 고정 여부'
  }
}, {
  tableName: 'chat_participants',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  indexes: [
    {
      name: 'idx_chat_participants_room_id',
      fields: ['chatRoomId']
    },
    {
      name: 'idx_chat_participants_user_id',
      fields: ['userId']
    },
    {
      name: 'idx_chat_participants_room_user',
      fields: ['chatRoomId', 'userId'],
      unique: true
    },
    {
      name: 'idx_chat_participants_active',
      fields: ['isActive']
    }
  ]
});

module.exports = ChatParticipant;