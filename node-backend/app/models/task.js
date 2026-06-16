const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const Task = sequelize.define('Task', {
  id: {
    type: DataTypes.STRING(66),
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING(120),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  reward_wei: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  deadline_unix: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  client_address: {
    type: DataTypes.STRING(42),
    allowNull: false,
  },
  worker_address: {
    type: DataTypes.STRING(42),
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'open',
  },
  deliverable_cid: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  release_as_stream: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  payout_duration_days: {
    type: DataTypes.INTEGER,
    defaultValue: 7,
  },
  escrow_tx_hash: {
    type: DataTypes.STRING(66),
    allowNull: true,
  },
  milestones: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  timestamps: true,
  tableName: 'tasks',
});

const TaskApplication = sequelize.define('TaskApplication', {
  id: {
    type: DataTypes.STRING(66),
    primaryKey: true,
  },
  task_id: {
    type: DataTypes.STRING(66),
    allowNull: false,
  },
  worker_address: {
    type: DataTypes.STRING(42),
    allowNull: false,
  },
  proposal: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  estimated_days: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  good_score_at_application: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  timestamps: true,
  tableName: 'task_applications',
});

module.exports = { Task, TaskApplication };
