const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const Loan = sequelize.define('Loan', {
  id: {
    type: DataTypes.STRING(66),
    primaryKey: true,
  },
  worker_address: {
    type: DataTypes.STRING(42),
    allowNull: false,
  },
  principal_wei: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  remaining_wei: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  repayment_deduction_pct: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  purpose: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  stream_tx: {
    type: DataTypes.STRING(66),
    allowNull: true,
  },
  fully_repaid: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  repaid_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  timestamps: true,
  tableName: 'loans',
});

module.exports = { Loan };
