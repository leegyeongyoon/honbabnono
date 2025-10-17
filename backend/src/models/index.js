const { sequelize } = require('../config/database');
const User = require('./User');
const Meetup = require('./Meetup');
const MeetupParticipant = require('./MeetupParticipant');

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
  initDatabase
};