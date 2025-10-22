const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ChatMessage = sequelize.define('ChatMessage', {
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
  senderId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: '발송자 ID',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  senderName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '발송자 이름'
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '메시지 내용'
  },
  messageType: {
    type: DataTypes.ENUM('text', 'image', 'file', 'system'),
    defaultValue: 'text',
    comment: '메시지 타입'
  },
  isEdited: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '수정 여부'
  },
  editedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '수정 시간'
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '삭제 여부'
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '삭제 시간'
  },
  replyToId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '답장 대상 메시지 ID',
    references: {
      model: 'chat_messages',
      key: 'id'
    }
  },
  fileUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '첨부파일 URL'
  },
  fileName: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: '첨부파일 이름'
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '첨부파일 크기'
  }
}, {
  tableName: 'chat_messages',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  indexes: [
    {
      name: 'idx_chat_messages_room_id',
      fields: ['chatRoomId']
    },
    {
      name: 'idx_chat_messages_sender_id',
      fields: ['senderId']
    },
    {
      name: 'idx_chat_messages_created_at',
      fields: ['createdAt']
    },
    {
      name: 'idx_chat_messages_room_created',
      fields: ['chatRoomId', 'createdAt']
    }
  ]
});

module.exports = ChatMessage;