const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MeetupParticipantPreference = sequelize.define('MeetupParticipantPreference', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  meetupId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'meetup_id'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id'
  },
  
  // 식사 성향 답변
  eatingSpeed: {
    type: DataTypes.ENUM('fast', 'slow', 'no_preference'),
    allowNull: true,
    field: 'eating_speed'
  },
  conversationDuringMeal: {
    type: DataTypes.ENUM('quiet', 'no_talk', 'chatty', 'no_preference'),
    allowNull: true,
    field: 'conversation_during_meal'
  },
  introvertLevel: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 1, max: 10 },
    field: 'introvert_level'
  },
  extrovertLevel: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 1, max: 10 },
    field: 'extrovert_level'
  },
  
  // 대화 성향 답변
  talkativeness: {
    type: DataTypes.ENUM('talkative', 'listener', 'moderate', 'no_preference'),
    allowNull: true
  },
  
  // 관심사 답변
  interests: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    defaultValue: []
  },
  
  // 음식 선호도
  foodPreferenceNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'food_preference_notes'
  },
  
  // 목적성 답변
  mealPurpose: {
    type: DataTypes.ENUM('networking', 'info_sharing', 'hobby_friendship', 'just_meal', 'no_preference'),
    allowNull: true,
    field: 'meal_purpose'
  },
  
  // 자유 입력 필드
  additionalNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'additional_notes'
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // 메타데이터
  answeredAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'answered_at'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'updated_at'
  }
}, {
  tableName: 'meetup_participant_preferences',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['meetup_id', 'user_id']
    }
  ]
});

module.exports = MeetupParticipantPreference;