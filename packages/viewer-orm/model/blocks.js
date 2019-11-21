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
  lastTxIncId: {
    type: BIGINT,
    allowNull: false,
    field: 'last_tx_inc_id'
  }
};

class Blocks extends Model {
  static async getLastIncId() {
    const result = await Blocks.findAll({
      order: [
        ['id', 'DESC']
      ],
      limit: 1
    });
    return result.length > 0 ? result[0].lastTxIncId : 0;
  }

  static insertIncId(id) {
    return Blocks.create({
      lastTxIncId: id
    });
  }

  static updateLastIncId(id, ...args) {
    return Blocks.update({
      lastTxIncId: id
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
