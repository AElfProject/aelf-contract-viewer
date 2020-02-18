/**
 * @file history model
 * @author atom-yang
 */
const Sequelize = require('sequelize');
const { commonModelOptions } = require('../common/viewer');

const {
  Model,
  BIGINT,
  STRING,
  TEXT,
  DATE,
  NOW,
  BOOLEAN
} = Sequelize;

const proposalDescription = {
  id: {
    type: BIGINT,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
    field: 'id'
  },
  contractName: {
    type: STRING(255),
    allowNull: false,
    defaultValue: '-1',
    field: 'contract_name',
    comment: 'user defined contract name'
  },
  contractAddress: {
    type: STRING(64),
    allowNull: false,
    field: 'contract_address',
    comment: 'proposal contract address'
  },
  contractMethod: {
    type: STRING(64),
    allowNull: false,
    field: 'contract_method',
    comment: 'proposal contract method'
  },
  proposalId: {
    type: STRING(64),
    allowNull: false,
    field: 'proposal_id',
    comment: 'proposal id'
  },
  proposer: {
    type: STRING(64),
    allowNull: false,
    field: 'proposer',
    comment: 'proposer address'
  },
  organizationAddress: {
    type: STRING(64),
    allowNull: false,
    field: 'organization_address',
    comment: 'organization address'
  },
  expiredTime: {
    type: DATE,
    allowNull: false,
    defaultValue: NOW,
    field: 'expired_time'
  },
  code: {
    type: TEXT('long'),
    allowNull: false,
    field: 'code',
    comment: 'code content'
  },
  released: {
    type: BOOLEAN,
    allowNull: false,
    field: 'released',
    comment: 'has been released'
  },
  createdTxId: {
    type: STRING(64),
    allowNull: false,
    field: 'created_tx_id',
    comment: 'correspond create proposal transaction id'
  },
  createdBlockHeight: {
    type: BIGINT,
    allowNull: false,
    field: 'created_block_height',
    comment: 'correspond create block height'
  },
  createdTime: {
    type: DATE,
    allowNull: false,
    defaultValue: NOW,
    field: 'created_time'
  },
  releasedTxId: {
    type: STRING(64),
    allowNull: false,
    defaultValue: 'none',
    field: 'released_tx_id',
    comment: 'correspond released proposal transaction id'
  },
  releasedBlockHeight: {
    type: BIGINT,
    allowNull: false,
    defaultValue: -1,
    field: 'released_block_height',
    comment: 'correspond released block height'
  },
  releasedTime: {
    type: DATE,
    allowNull: false,
    defaultValue: NOW,
    field: 'released_time'
  }
};

class Proposal extends Model {
  static getCode(proposalId) {
    return Proposal.findOne({
      attributes: ['code'],
      where: {
        proposalId
      }
    });
  }
}

Proposal.init(proposalDescription, {
  ...commonModelOptions,
  tableName: 'proposal'
});

module.exports = {
  Proposal,
  proposalDescription
};
