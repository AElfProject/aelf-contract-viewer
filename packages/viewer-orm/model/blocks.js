/**
 * @file blocks model
 * @author atom-yang
 */
const Sequelize = require('sequelize');
const { commonModelOptions } = require('../common');

const {
  Model,
  BIGINT,
  Op
} = Sequelize;

const blocksDescription = {
  id: {
    type: BIGINT,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
    field: 'id'
  },
  lastBlockHeight: {
    type: BIGINT,
    allowNull: false,
    field: 'last_block_height'
  }
};

class Blocks extends Model {
  static async getLastHeight() {
    const result = await Blocks.findAll({
      order: [
        ['id', 'DESC']
      ],
      limit: 1
    });
    return result.length > 0 ? result[0].lastBlockHeight : 0;
  }

  static insertHeight(height) {
    return Blocks.create({
      lastBlockHeight: height
    });
  }

  static updateLastBlockHeight(height, ...args) {
    return Blocks.update({
      lastBlockHeight: height
    }, {
      where: {
        id: {
          [Op.gt]: 0
        }
      }
    }, ...args);
  }
}

Blocks.init(blocksDescription, {
  ...commonModelOptions,
  tableName: 'blocks'
});

module.exports = {
  Blocks,
  blocksDescription
};
