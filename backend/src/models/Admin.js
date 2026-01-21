const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Admin = sequelize.define('Admin', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: '관리자 아이디'
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '암호화된 비밀번호'
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    comment: '관리자 이메일'
  },
  role: {
    type: DataTypes.ENUM('admin', 'super_admin'),
    defaultValue: 'admin',
    comment: '관리자 권한 레벨'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '계정 활성화 여부'
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '마지막 로그인 시간'
  }
}, {
  tableName: 'admins',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['username']
    },
    {
      fields: ['email']
    }
  ]
});

module.exports = Admin;