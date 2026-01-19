const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Meetup = sequelize.define('Meetup', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  time: {
    type: DataTypes.TIME,
    allowNull: false
  },
  maxParticipants: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'max_participants'
  },
  currentParticipants: {
    type: DataTypes.INTEGER,
    defaultValue: 1, // 호스트 포함
    field: 'current_participants'
  },
  category: {
    type: DataTypes.ENUM('한식', '중식', '일식', '양식', '카페', '술집', '기타'),
    allowNull: false
  },
  priceRange: {
    type: DataTypes.ENUM('1만원 이하', '1-2만원', '2-3만원', '3만원 이상'),
    allowNull: true,
    field: 'price_range'
  },
  image: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('모집중', '모집완료', '진행중', '종료'),
    defaultValue: '모집중'
  },
  hostId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'host_id'
  },
  requirements: {
    type: DataTypes.TEXT,
    allowNull: true // 참가 조건 등
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  ageRange: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'age_range'
  },
  genderPreference: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'gender_preference'
  },
  diningPreferences: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'dining_preferences'
  },
  promiseDepositAmount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'promise_deposit_amount'
  },
  promiseDepositRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'promise_deposit_required'
  },
  allowDirectChat: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'allow_direct_chat'
  },
  // GPS 체크인 설정
  checkInRadius: {
    type: DataTypes.INTEGER,
    defaultValue: 300, // 체크인 허용 반경(m) - 300m
    field: 'check_in_radius'
  },
  durationMinutes: {
    type: DataTypes.INTEGER,
    defaultValue: 180, // 모임 예상 시간(분) - 3시간
    field: 'duration_minutes'
  },
  endedAt: {
    type: DataTypes.DATE,
    allowNull: true, // 실제 종료 시각
    field: 'ended_at'
  }
}, {
  tableName: 'meetups',
  timestamps: true,
  underscored: true
});

module.exports = Meetup;