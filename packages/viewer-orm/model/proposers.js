/**
 * @file proposers model
 * @author atom-yang
 */
const Sequelize = require('sequelize');
const { commonModelOptions } = require('../common');
const config = require('../config');

const {
  constants: {
    proposalTypes
  }
} = config;

const {
  Model,
  BIGINT,
  STRING,
  ENUM,
  DATE,
  NOW
} = Sequelize;

// organization proposers
const proposersDescription = {
  id: {
    type: BIGINT,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
    field: 'id'
  },
  orgAddress: {
    type: STRING(255),
    allowNull: false,
    field: 'org_address'
  },
  relatedTxId: {
    type: STRING(255),
    allowNull: false,
    field: 'related_tx_id'
  },
  // 通过proposer筛选可用的organization
  proposer: {
    type: STRING(255),
    allowNull: false
  },
  proposalType: {
    type: ENUM(
      proposalTypes.REFERENDUM,
      proposalTypes.ASSOCIATION,
    ),
    allowNull: false,
    field: 'proposal_type',
    comment: 'audit model of proposal'
  },
  createAt: {
    type: DATE,
    allowNull: false,
    defaultValue: NOW
  }
};

class Proposers extends Model {
  static async getOrganizations(proposalType, proposer) {
    const result = await Proposers.findAll({
      attributes: ['orgAddress', 'proposer'],
      where: {
        proposer,
        proposalType
      }
    });
    return result || [];
  }
}

Proposers.init(proposersDescription, {
  ...commonModelOptions,
  tableName: 'proposers'
});

module.exports = {
  Proposers,
  proposersDescription
};
