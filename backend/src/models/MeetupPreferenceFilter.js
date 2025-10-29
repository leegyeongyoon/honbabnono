const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MeetupPreferenceFilter = sequelize.define('MeetupPreferenceFilter', {
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
  
  // 기본 조건 (필수)
  genderFilter: {
    type: DataTypes.ENUM('male', 'female', 'anyone'),
    defaultValue: 'anyone',
    field: 'gender_filter'
  },
  ageFilterMin: {
    type: DataTypes.INTEGER,
    defaultValue: 18,
    field: 'age_filter_min'
  },
  ageFilterMax: {
    type: DataTypes.INTEGER,
    defaultValue: 100,
    field: 'age_filter_max'
  },
  locationFilter: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'location_filter'
  },
  
  // 식사 성향 (선택)
  eatingSpeed: {
    type: DataTypes.ENUM('fast', 'slow', 'no_preference'),
    defaultValue: 'no_preference',
    field: 'eating_speed'
  },
  conversationDuringMeal: {
    type: DataTypes.ENUM('quiet', 'no_talk', 'chatty', 'no_preference'),
    defaultValue: 'no_preference',
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
  
  // 대화 성향 (선택)
  talkativeness: {
    type: DataTypes.ENUM('talkative', 'listener', 'moderate', 'no_preference'),
    defaultValue: 'no_preference'
  },
  
  // 관심사 (선택) - JSON 배열
  interests: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    defaultValue: []
  },
  
  // 음식 조건 (필수)
  foodCategory: {
    type: DataTypes.ENUM('korean', 'western', 'japanese', 'dessert', 'no_preference'),
    defaultValue: 'no_preference',
    field: 'food_category'
  },
  specificRestaurant: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'specific_restaurant'
  },
  
  // 목적성 (선택)
  mealPurpose: {
    type: DataTypes.ENUM('networking', 'info_sharing', 'hobby_friendship', 'just_meal', 'no_preference'),
    defaultValue: 'no_preference',
    field: 'meal_purpose'
  },
  
  // 메타데이터
  isRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_required'
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
  tableName: 'meetup_preference_filters',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = MeetupPreferenceFilter;