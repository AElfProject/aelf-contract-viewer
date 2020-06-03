/**
 * @file transactions model
 * @author atom-yang
 */
const Sequelize = require('sequelize');
const { scanModelOptions } = require('../common/scan');
const {
  Transactions
} = require('./transactions');

const {
  Model,
  BIGINT,
  STRING
} = Sequelize;

const tokenTxDescription = {
  id: {
    type: BIGINT,
    allowNull: false,
    primaryKey: true,
    field: 'id'
  },
  symbol: {
    type: STRING(255),
    allowNull: false,
    field: 'symbol'
  },
  txId: {
    type: STRING(64),
    allowNull: false,
    field: 'tx_id'
  },
  event: {
    type: STRING(255),
    allowNull: false
  },
};

class TokenTx extends Model {
  static async getTxList(symbol, pageNum, pageSize) {
    const result = await TokenTx.findAndCountAll({
      order: [
        ['id', 'DESC']
      ],
      where: {
        symbol
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
      [v.txId]: v.toJSON()
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
}

TokenTx.init(tokenTxDescription, {
  ...scanModelOptions,
  tableName: 'token_tx'
});

module.exports = {
  TokenTx,
  tokenTxDescription
};
