const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Review = sequelize.define('Review', {
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
  reviewerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'reviewer_id' // 리뷰 작성자
  },
  revieweeId: {
    type: DataTypes.UUID,
    allowNull: true, // 기존 테이블에서 NULL 허용
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'reviewee_id' // 리뷰 대상 (호스트 또는 참가자)
  },
  reviewerName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'reviewer_name' // 기존 테이블 호환성을 위한 필드
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  tags: {
    type: DataTypes.JSONB, // 기존 테이블이 JSONB 타입으로 되어 있음
    defaultValue: [] // ['맛있었어요', '시간약속잘지킴', '친절해요', '다시만나고싶어요']
  },
  isAnonymous: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_anonymous'
  }
}, {
  tableName: 'reviews',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      // 같은 모임에서 같은 사람에게 중복 리뷰 방지
      unique: true,
      fields: ['meetup_id', 'reviewer_id', 'reviewee_id']
    },
    {
      // 리뷰 대상별 조회 최적화
      fields: ['reviewee_id']
    }
  ]
});

module.exports = Review;
