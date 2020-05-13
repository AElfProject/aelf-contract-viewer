/**
 * @file contracts model
 * @author atom-yang
 */
const Sequelize = require('sequelize');
const { commonModelOptions } = require('../common/viewer');

const {
  Model,
  BIGINT,
  STRING,
  BOOLEAN,
  DATE,
  NOW,
  col,
  Op
} = Sequelize;

const contractsDescription = {
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
  address: {
    type: STRING(64),
    allowNull: false,
    field: 'address',
    comment: 'contract address'
  },
  author: {
    type: STRING(64),
    allowNull: false,
    field: 'author',
    comment: 'contract author'
  },
  category: {
    type: STRING(12),
    allowNull: false,
    field: 'category',
    comment: 'the category of contract'
  },
  isSystemContract: {
    type: BOOLEAN,
    allowNull: false,
    field: 'is_system_contract',
    comment: 'is system contract or not'
  },
  serial: {
    type: STRING(12),
    allowNull: false,
    field: 'serial',
    comment: 'the serial number of contract'
  },
  version: {
    type: STRING(255),
    allowNull: false,
    field: 'version',
    defaultValue: '1',
    comment: 'current contract version'
  },
  updateTime: {
    type: DATE,
    allowNull: false,
    defaultValue: NOW,
    field: 'update_time'
  }
};

class Contracts extends Model {
  static async getContractName(address) {
    const result = await Contracts.findOne({
      attributes: ['contractName'],
      where: {
        address
      }
    });
    if (result && +result.contractName !== -1) {
      return result.contractName;
    }
    return '';
  }

  static async getInfoByAddress(address) {
    const result = await Contracts.findOne({
      where: {
        address
      }
    });
    if (result) {
      return result.toJSON();
    }
    return {};
  }

  static async getAllList(search) {
    let list;
    if (search) {
      list = await Contracts.findAll({
        attributes: ['address', 'contractName', 'isSystemContract'],
        where: {
          address: {
            [Op.substring]: search
          }
        }
      });
    } else {
      list = await Contracts.findAll({
        attributes: ['address', 'contractName', 'isSystemContract']
      });
    }
    return list;
  }

  static async getList(params) {
    const {
      pageSize,
      pageNum,
      address = ''
    } = params;
    const result = await Contracts.findAndCountAll({
      where: {
        address: {
          [Op.substring]: address
        }
      },
      order: [
        [col('updateTime'), 'DESC'],
        ['id', 'DESC']
      ],
      offset: (pageNum - 1) * pageSize,
      limit: +pageSize
    });
    const total = result.count;
    const list = result.rows.map(v => v.toJSON());
    return {
      total,
      list
    };
  }

  static async isExistName(contractName) {
    const isExist = await Contracts.findOne({
      attributes: ['id'],
      where: {
        contractName
      }
    });
    return !!isExist;
  }
}

Contracts.init(contractsDescription, {
  ...commonModelOptions,
  tableName: 'contracts'
});

module.exports = {
  Contracts,
  contractsDescription
};
