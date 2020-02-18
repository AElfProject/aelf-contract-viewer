/**
 * @file transactions model
 * @author atom-yang
 */
const Sequelize = require('sequelize');
const { scanModelOptions } = require('../common/scan');

const {
  Model,
  BIGINT,
  STRING
} = Sequelize;

const blocksDescription = {
  id: {
    type: BIGINT,
    allowNull: false,
    primaryKey: true,
    field: 'id'
  },
  chainId: {
    type: STRING(64),
    allowNull: false,
    field: 'chain_id'
  },
  blockHash: {
    type: STRING(64),
    allowNull: false,
    field: 'block_hash'
  },
  blockHeight: {
    type: BIGINT,
    allowNull: false,
    field: 'block_height'
  }
};

class Blocks extends Model {
  static async getHighestHeight() {
    return Blocks.findOne({
      attributes: ['blockHeight'],
      order: [
        ['blockHeight', 'DESC']
      ],
      limit: 1
    });
  }
}

Blocks.init(blocksDescription, {
  ...scanModelOptions,
  tableName: 'blocks_0'
});

module.exports = {
  Blocks,
  blocksDescription
};
