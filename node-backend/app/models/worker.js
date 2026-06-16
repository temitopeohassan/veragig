const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const Worker = sequelize.define('Worker', {
  address: {
    type: DataTypes.STRING(42),
    primaryKey: true,
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  good_score: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  loan_tier: {
    type: DataTypes.STRING(20),
    defaultValue: 'none',
  },
  tasks_completed: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  tasks_accepted: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  disputes_lost: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  loans_repaid_on_time: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  ubi_claim_streak_days: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  earning_consistency_weeks: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  total_earned_wei: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
  },
  identity_expiry_unix: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
  },
  last_score_update_block: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
  },
}, {
  timestamps: true,
  tableName: 'workers',
});

module.exports = { Worker };
