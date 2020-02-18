/**
 * @file contracts model
 * @author atom-yang
 */
const Sequelize = require('sequelize');
const { commonModelOptions } = require('../common/viewer');

const {
  Model,
  BIGINT,
  ENUM,
  STRING,
  DATE,
  NOW
} = Sequelize;

const contractNamesDescription = {
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
    unique: true,
    defaultValue: '-1',
    field: 'contract_name',
    comment: 'user defined contract name'
  },
  address: {
    type: STRING(64),
    allowNull: false,
    field: 'address',
    comment: 'address of proposal creator'
  },
  proposalId: {
    type: STRING(64),
    allowNull: false,
    field: 'proposal_id',
    comment: 'proposal id'
  },
  txId: {
    type: STRING(64),
    allowNull: false,
    field: 'tx_id'
  },
  action: {
    type: ENUM('DEPLOY', 'UPDATE'),
    allowNull: false,
    field: 'action',
    comment: 'action type to a contract'
  },
  createAt: {
    type: DATE,
    allowNull: false,
    defaultValue: NOW,
    field: 'create_at'
  }
};

class ContractNames extends Model {
  static async getContractName(proposalId) {
    const name = await ContractNames.findOne({
      attributes: ['contractName'],
      where: {
        proposalId
      }
    });
    if (name) {
      return name.contractName;
    }
    return null;
  }

  static async isExist(contractName) {
    const isExist = await ContractNames.findOne({
      attributes: ['id'],
      where: {
        contractName
      }
    });
    return !!isExist;
  }

  static async addName(params) {
    const {
      contractName
    } = params;
    const isExist = await ContractNames.isExist(contractName);
    if (isExist) {
      return false;
    }
    const {
      txId,
      address,
      proposalId,
      action
    } = params;
    return ContractNames.create({
      txId,
      address,
      proposalId,
      action,
      contractName
    });
  }
}

ContractNames.init(contractNamesDescription, {
  ...commonModelOptions,
  tableName: 'contract_names'
});

module.exports = {
  ContractNames,
  contractNamesDescription
};
