const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Advertisement = sequelize.define('Advertisement', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '광고 제목'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '광고 설명'
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '광고 이미지 URL'
  },
  linkUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '광고 클릭 시 이동할 URL (외부 링크용)'
  },
  useDetailPage: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '디테일 페이지 사용 여부 (true: 디테일 페이지, false: 외부 링크)'
  },
  detailContent: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '광고 디테일 페이지 HTML 콘텐츠'
  },
  businessName: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '사업체명'
  },
  contactInfo: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '연락처 정보'
  },
  position: {
    type: DataTypes.ENUM('home_banner', 'sidebar', 'bottom'),
    defaultValue: 'home_banner',
    comment: '광고 표시 위치'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '광고 활성화 여부'
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '광고 시작 날짜'
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '광고 종료 날짜'
  },
  clickCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '광고 클릭 수'
  },
  viewCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '광고 노출 수'
  },
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '광고 우선순위 (높을수록 먼저 표시)'
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: '광고 생성자 (관리자) ID'
  }
}, {
  tableName: 'advertisements',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['position', 'is_active', 'priority']
    },
    {
      fields: ['start_date', 'end_date']
    }
  ]
});

module.exports = Advertisement;