const { sequelize } = require('../config/database');
const User = require('./User');
const Meetup = require('./Meetup');
const MeetupParticipant = require('./MeetupParticipant');
const ChatRoom = require('./ChatRoom');
const ChatMessage = require('./ChatMessage');
const ChatParticipant = require('./ChatParticipant');

// 모델 간 관계 설정
// User와 Meetup 관계 (호스트)
User.hasMany(Meetup, { 
  foreignKey: 'hostId', 
  as: 'hostedMeetups' 
});
Meetup.belongsTo(User, { 
  foreignKey: 'hostId', 
  as: 'host' 
});

// User와 Meetup 다대다 관계 (참가자)
User.belongsToMany(Meetup, {
  through: MeetupParticipant,
  foreignKey: 'userId',
  otherKey: 'meetupId',
  as: 'joinedMeetups'
});

Meetup.belongsToMany(User, {
  through: MeetupParticipant,
  foreignKey: 'meetupId',
  otherKey: 'userId',
  as: 'participants'
});

// MeetupParticipant와 다른 모델들 관계
MeetupParticipant.belongsTo(User, { 
  foreignKey: 'userId', 
  as: 'user' 
});
MeetupParticipant.belongsTo(Meetup, { 
  foreignKey: 'meetupId', 
  as: 'meetup' 
});

// 채팅 관련 관계 설정
// ChatRoom과 Meetup 관계 (모임 채팅방)
Meetup.hasOne(ChatRoom, {
  foreignKey: 'meetupId',
  as: 'chatRoom'
});
ChatRoom.belongsTo(Meetup, {
  foreignKey: 'meetupId',
  as: 'meetup'
});

// ChatRoom과 ChatMessage 관계 (일대다)
ChatRoom.hasMany(ChatMessage, {
  foreignKey: 'chatRoomId',
  as: 'messages'
});
ChatMessage.belongsTo(ChatRoom, {
  foreignKey: 'chatRoomId',
  as: 'chatRoom'
});

// ChatRoom과 ChatParticipant 관계 (일대다)
ChatRoom.hasMany(ChatParticipant, {
  foreignKey: 'chatRoomId',
  as: 'participants'
});
ChatParticipant.belongsTo(ChatRoom, {
  foreignKey: 'chatRoomId',
  as: 'chatRoom'
});

// ChatMessage 자기 참조 관계 (답장)
ChatMessage.belongsTo(ChatMessage, {
  foreignKey: 'replyToId',
  as: 'replyTo'
});
ChatMessage.hasMany(ChatMessage, {
  foreignKey: 'replyToId',
  as: 'replies'
});

// ChatParticipant와 ChatMessage 관계 (마지막 읽은 메시지)
ChatParticipant.belongsTo(ChatMessage, {
  foreignKey: 'lastReadMessageId',
  as: 'lastReadMessage'
});

// 데이터베이스 초기화 함수
const initDatabase = async () => {
  try {
    // 데이터베이스 연결 테스트
    await sequelize.authenticate();
    console.log('✅ PostgreSQL 데이터베이스 연결 성공');

    // 테이블 생성 (개발 환경에서만)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ 데이터베이스 테이블 동기화 완료');
    }

    return true;
  } catch (error) {
    console.error('❌ 데이터베이스 연결 실패:', error.message);
    console.log('⚠️  데이터베이스 없이 서버를 시작합니다 (제한된 기능)');
    return false;
  }
};

module.exports = {
  sequelize,
  User,
  Meetup,
  MeetupParticipant,
  ChatRoom,
  ChatMessage,
  ChatParticipant,
  initDatabase
};