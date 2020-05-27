/**
 * @file transfer model
 * @author atom-yang
 */
const Sequelize = require('sequelize');
const { commonModelOptions } = require('../common/viewer');
const { Transactions } = require('./transactions');

const {
  Model,
  BIGINT,
  STRING,
  DECIMAL,
  ENUM,
  Op
} = Sequelize;

const transferDescription = {
  id: {
    type: BIGINT,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
    field: 'id'
  },
  txId: {
    type: STRING(255),
    allowNull: false,
    field: 'tx_id'
  },
  from: {
    type: STRING(255),
    allowNull: false
  },
  to: {
    type: STRING(255),
    allowNull: false
  },
  amount: {
    type: DECIMAL(64, 8),
    allowNull: false,
    defaultValue: 0
  },
  symbol: {
    type: STRING(255),
    allowNull: false
  },
  action: {
    type: STRING(255),
    allowNull: false
  },
  isCrossChain: {
    type: ENUM('no', 'Transfer', 'Receive'),
    field: 'is_cross_chain'
  },
  relatedChainId: {
    type: STRING(255),
    field: 'related_chain_id',
    allowNull: false
  },
  memo: {
    type: STRING(255),
    allowNull: true
  }
};

class Transfer extends Model {
  static async getTransferByAddress(address, pageNum, pageSize) {
    const result = await Transfer.findAndCountAll({
      order: [
        ['id', 'DESC']
      ],
      where: {
        [Op.or]: {
          addressFrom: address,
          addressTo: address
        }
      },
      limit: +pageSize,
      offset: (pageNum - 1) * pageSize
    });
    const total = result.count;
    let list = result.rows.map(v => v.toJSON());
    const ids = list.map(v => v.txId);
    let txs = await Transactions.getTransactionsByIds(ids);
    txs = txs.reduce((acc, v) => ({
      ...acc,
      [v.txId]: v
    }), {});
    list = list.map(item => ({
      ...item,
      ...(txs[item.txId] || {})
    }));
    return {
      total,
      list
    };
  }

  static async getTransferBySymbol(symbol, pageNum, pageSize) {
    const result = await Transfer.findAndCountAll({
      order: [
        ['id', 'DESC']
      ],
      where: {
        symbol,
      },
      limit: +pageSize,
      offset: (pageNum - 1) * pageSize
    });
    const total = result.count;
    const list = result.rows.map(v => v.toJSON());
    return {
      total,
      list
    };
  }
}

Transfer.init(transferDescription, {
  ...commonModelOptions,
  tableName: 'transfer'
});

module.exports = {
  Transfer,
  transferDescription
};
