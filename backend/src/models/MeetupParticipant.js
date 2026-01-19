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
  },
  // GPS 출석 인증 관련 필드
  attended: {
    type: DataTypes.BOOLEAN,
    defaultValue: false // GPS 인증 완료 여부
  },
  attendedAt: {
    type: DataTypes.DATE,
    allowNull: true, // 인증 시각
    field: 'attended_at'
  },
  attendanceLatitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true, // 인증 위치 위도
    field: 'attendance_latitude'
  },
  attendanceLongitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true, // 인증 위치 경도
    field: 'attendance_longitude'
  },
  attendanceDistance: {
    type: DataTypes.INTEGER,
    allowNull: true, // 모임 장소와의 거리(m)
    field: 'attendance_distance'
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