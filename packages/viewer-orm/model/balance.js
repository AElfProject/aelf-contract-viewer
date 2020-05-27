/**
 * @file balance model
 * @author atom-yang
 */
const Sequelize = require('sequelize');
const {
  formatTimeWithZone
} = require('../common/utils');
const { commonModelOptions } = require('../common/viewer');

const {
  Model,
  BIGINT,
  STRING,
  DECIMAL,
  DATE,
  NOW,
  Op
} = Sequelize;

const balanceDescription = {
  id: {
    type: BIGINT,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
    field: 'id'
  },
  owner: {
    type: STRING(255),
    allowNull: false
  },
  symbol: {
    type: STRING(255),
    allowNull: false,
    defaultValue: 'none'
  },
  balance: {
    type: DECIMAL(64, 8),
    allowNull: false,
    defaultValue: 0
  },
  count: {
    type: BIGINT,
    allowNull: false,
    defaultValue: 0
  },
  updatedAt: {
    type: DATE,
    allowNull: false,
    defaultValue: NOW,
    get() {
      const time = this.getDataValue('updatedAt');
      try {
        return formatTimeWithZone(time);
      } catch (e) {
        return time;
      }
    }
  }
};

class Balance extends Model {
  static async getOwnerBySymbol(symbol, pageNum, pageSize) {
    const result = await Balance.findAndCountAll({
      attributes: [
        'owner',
        'symbol',
        'balance',
        'count'
      ],
      order: [
        ['balance', 'DESC'],
        ['id', 'DESC']
      ],
      where: {
        symbol
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

  static async getBalanceByOwner(owner, search = '') {
    let whereCondition = {
      owner
    };
    if (search) {
      whereCondition = {
        ...whereCondition,
        symbol: {
          [Op.substring]: search
        }
      };
    }
    const result = await Balance.findAll({
      attributes: [
        'symbol',
        'balance'
      ],
      order: [
        ['balance', 'DESC']
      ],
      where: whereCondition
    });
    return result || [];
  }

  static async addOrCreate(item, transaction) {
    const [
      list,
      created
    ] = await Balance.findOrCreate({
      where: {
        owner: item.owner,
        symbol: item.symbol
      },
      defaults: {
        ...item,
        count: 1
      },
      transaction
    });
    if (!created) {
      await Balance.update({
        ...item,
        balance: item.balance,
        count: list.count + 1
      }, {
        where: {
          id: list.id
        },
        transaction
      });
    }
  }
}

Balance.init(balanceDescription, {
  ...commonModelOptions,
  tableName: 'balance'
});

module.exports = {
  Balance,
  balanceDescription
};
