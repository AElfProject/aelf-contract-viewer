/**
 * @file nft_transfer model
 * @author hzz780
 */
const { Model, Op } = require('sequelize');
const { commonModelOptions } = require('../common/viewer');
const { transferDescription } = require('./transfer');
const { Transactions } = require('./transactions');

class NftTransfer extends Model {
  static async getTransferByAddress(address, pageNum, pageSize) {
    const result = await NftTransfer.findAndCountAll({
      order: [
        ['id', 'DESC']
      ],
      where: {
        [Op.or]: {
          from: address,
          to: address
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

  static async getTransferBySymbol(symbol, pageNum, pageSize) {
    const result = await NftTransfer.findAndCountAll({
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

NftTransfer.init(transferDescription, {
  ...commonModelOptions,
  tableName: 'nft_transfer'
});

module.exports = {
  NftTransfer,
  transferDescription
};
