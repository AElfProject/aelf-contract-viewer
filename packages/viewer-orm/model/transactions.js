/**
 * @file transactions model
 * @author atom-yang
 */
const Sequelize = require('sequelize');
const { scanModelOptions } = require('../common/scan');

const {
  Model,
  DECIMAL,
  BIGINT,
  STRING,
  TEXT,
  Op
} = Sequelize;

const transactionsDescription = {
  id: {
    type: BIGINT,
    allowNull: false,
    primaryKey: true,
    field: 'id'
  },
  txId: {
    type: STRING(64),
    allowNull: false,
    field: 'tx_id'
  },
  paramsTo: {
    type: STRING(64),
    allowNull: false,
    defaultValue: '-1',
    field: 'params_to'
  },
  chainId: {
    type: STRING(64),
    allowNull: false,
    field: 'chain_id'
  },
  blockHeight: {
    type: BIGINT,
    allowNull: false,
    field: 'block_height'
  },
  addressFrom: {
    type: STRING(64),
    allowNull: false,
    field: 'address_from'
  },
  addressTo: {
    type: STRING(64),
    allowNull: false,
    field: 'address_to'
  },
  params: {
    type: TEXT,
    allowNull: false,
    field: 'params'
  },
  method: {
    type: STRING(64),
    allowNull: false,
    field: 'method'
  },
  blockHash: {
    type: STRING(64),
    allowNull: false,
    field: 'block_hash'
  },
  quantity: {
    type: BIGINT,
    allowNull: false,
    field: 'quantity'
  },
  txFee: {
    type: DECIMAL(64, 8),
    allowNull: false,
    field: 'tx_fee',
    defaultValue: 0
  },
  resources: {
    type: STRING(255)
  },
  txStatus: {
    type: STRING(64),
    allowNull: false,
    field: 'tx_status'
  },
  time: {
    type: STRING(64),
    allowNull: false,
    field: 'time'
  }
};

class Transactions extends Model {
  static getTransactionsByIds(txIds) {
    return Transactions.findAll({
      attributes: [
        'txId',
        'time',
        'method',
        'txFee',
        'blockHeight'
      ],
      where: {
        txId: {
          [Op.in]: txIds
        }
      }
    });
  }

  static async getTransactionsByPage(pageSize, pageNum, lastId, addressTo) {
    const ids = await Transactions.findAll({
      attributes: ['id'],
      where: {
        addressTo: {
          [Op.in]: addressTo
        },
        id: {
          [Op.gt]: lastId
        }
      },
      order: [
        ['id', 'ASC']
      ],
      limit: +pageSize,
      offset: pageNum * pageSize
    });
    if (!ids) {
      return [];
    }
    return Transactions.findAll({
      attributes: {
        exclude: ['paramsTo', 'chainId', 'addressFrom', 'params', 'quantity']
      },
      where: {
        id: {
          [Op.in]: ids.map(v => v.toJSON().id)
        }
      }
    });
  }

  static async getTransactionsInRange(minId, currentMaxId, whereCondition) {
    const result = await Transactions.findAll({
      attributes: ['txId', 'addressTo', 'blockHeight', 'method', 'time', 'txStatus'],
      where: {
        blockHeight: {
          [Op.between]: [minId + 1, currentMaxId]
        },
        ...whereCondition
      },
      order: [
        ['blockHeight', 'ASC']
      ]
    });
    if (!result) {
      return [];
    }
    return result;
  }

  static async getTransactionsById(minId, currentMaxId, addressTo) {
    const result = await Transactions.findAll({
      attributes: {
        exclude: ['paramsTo', 'chainId', 'addressFrom', 'params', 'quantity']
      },
      where: {
        blockHeight: {
          [Op.between]: [minId + 1, currentMaxId]
        },
        addressTo: {
          [Op.in]: addressTo
        }
      },
      order: [
        ['blockHeight', 'ASC']
      ]
    });
    if (!result) {
      return [];
    }
    return result;
  }

  static getMaxId() {
    return Transactions.findOne({
      attributes: ['id'],
      order: [
        ['id', 'DESC']
      ],
      limit: 1
    });
  }
}

Transactions.init(transactionsDescription, {
  ...scanModelOptions,
  tableName: 'transactions_0'
});

module.exports = {
  Transactions,
  transactionsDescription
};
