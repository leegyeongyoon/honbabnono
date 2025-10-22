const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true, // 카카오 로그인에서는 이메일이 없을 수 있음
    unique: true,
    validate: {
      isEmail: true
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true // 카카오 로그인 사용자는 비밀번호가 없을 수 있음
  },
  profileImage: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'profile_image'
  },
  provider: {
    type: DataTypes.ENUM('email', 'kakao'),
    defaultValue: 'email'
  },
  providerId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'provider_id'
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_verified'
  },
  rating: {
    type: DataTypes.DECIMAL(2, 1),
    defaultValue: 5.0
  },
  meetupsJoined: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'meetups_joined'
  },
  meetupsHosted: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'meetups_hosted'
  },
  babAlScore: {
    type: DataTypes.INTEGER,
    defaultValue: 50,
    field: 'babal_score'
  },
  preferences: {
    type: DataTypes.JSONB,
    allowNull: true // 식사 선호도 등 저장
  }
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true
});

module.exports = User;