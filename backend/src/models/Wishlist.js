const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Wishlist = sequelize.define('Wishlist', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
  },
  meetupId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'meetup_id',
  },
}, {
  tableName: 'meetup_wishlists',
  underscored: true,
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'meetup_id'],
      name: 'meetup_wishlists_user_meetup_unique',
    },
  ],
});

module.exports = Wishlist;
