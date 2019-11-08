/**
 * @file history model
 * @author atom-yang
 */
const Sequelize = require('sequelize');
const { commonModelOptions } = require('../common');

const {
  Model,
  BIGINT,
  STRING,
  TEXT,
  DATE,
  NOW,
  col
} = Sequelize;

const codeDescription = {
  id: {
    type: BIGINT,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
    field: 'id'
  },
  address: {
    type: STRING(64),
    allowNull: false,
    field: 'address',
    comment: 'contract address'
  },
  codeHash: {
    type: STRING(64),
    allowNull: false,
    field: 'code_hash',
    comment: 'code hash address'
  },
  author: {
    type: STRING(64),
    allowNull: false,
    field: 'author',
    comment: 'contract author'
  },
  code: {
    type: TEXT('long'),
    allowNull: false,
    field: 'code',
    comment: 'code content'
  },
  event: {
    type: STRING(255),
    allowNull: false,
    field: 'event',
    comment: 'transaction event'
  },
  txId: {
    type: STRING(64),
    allowNull: false,
    field: 'tx_id',
    comment: 'correspond transaction id'
  },
  blockHeight: {
    type: BIGINT,
    allowNull: false,
    field: 'block_height',
    comment: 'correspond block height'
  },
  updateTime: {
    type: DATE,
    allowNull: false,
    defaultValue: NOW,
    field: 'update_time'
  }
};

class Code extends Model {
  static getIdByCodeHash(codeHash) {
    return Code.findOne({
      attributes: ['id'],
      where: {
        codeHash
      }
    });
  }

  static getMaxId() {
    return Code.findOne({
      attributes: ['id'],
      order: [
        ['id', 'DESC']
      ]
    }).then(v => v.id);
  }

  static getCodeById(id) {
    return Code.findOne({
      attributes: ['id', 'address', 'codeHash', 'code'],
      where: {
        id
      }
    });
  }

  static getHistory(address) {
    return Code.findAll({
      attributes: {
        exclude: ['code']
      },
      where: {
        address
      },
      order: [
        [col('updateTime'), 'DESC']
      ]
    });
  }
}

Code.init(codeDescription, {
  ...commonModelOptions,
  tableName: 'code'
});

module.exports = {
  Code,
  codeDescription
};
