/**
 * @file balance model
 * @author atom-yang
 */
const Sequelize = require('sequelize');
const {
  formatTimeWithZone
} = require('../common/utils');
const { scanModelOptions } = require('../common/scan');

const {
  Model,
  BIGINT,
  STRING,
  DECIMAL,
  NOW,
  Op,
  fn,
  col
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
    type: STRING(64),
    allowNull: false,
    defaultValue: NOW,
    field: 'updated_at',
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
        symbol,
        balance: {
          [Op.gt]: 0
        }
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

  // @Deprecated: can not deal the holders which balance > 0 and add the all transfers count
  // use getHoldersAndTransfersCountBySymbols instead
  static async getCountBySymbols() {
    return Balance.findAll({
      attributes: [
        'symbol',
        [fn('COUNT', col('symbol')), 'holders'],
        [fn('SUM', col('count')), 'transfers']
      ],
      group: 'symbol'
    });
  }

  static async getHoldersAndTransfersCountBySymbols() {
    const holdersPromise = Balance.getHoldersBySymbols();
    const transfersCountPromise = Balance.getTransfersCountBySymbols();
    const result = await Promise.all([holdersPromise, transfersCountPromise]);
    const holders = result[0];
    const transfersCount = result[1];
    return transfersCount.map(item => {
      const itemTemp = item.toJSON();
      const holdersMatched = holders.find(holder => {
        const holderTemp = holder.toJSON();
        return holderTemp.symbol === itemTemp.symbol;
      }).holders;
      return {
        ...item,
        holders: holdersMatched
      };
    });
  }

  static async getHoldersBySymbols() {
    return Balance.findAll({
      attributes: [
        'symbol',
        [fn('COUNT', col('symbol')), 'holders'],
      ],
      group: 'symbol',
      where: {
        balance: {
          [Op.gt]: 0
        }
      }
    });
  }

  static async getTransfersCountBySymbols() {
    return Balance.findAll({
      attributes: [
        'symbol',
        [fn('SUM', col('count')), 'transfers']
      ],
      group: 'symbol'
    });
  }

  static async getBalanceByOwner(owner, search = '') {
    let whereCondition = {
      owner,
      balance: {
        [Op.gt]: 0
      }
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

  static getTokenCount() {
    return Balance.findAll({
      attributes: [
        'symbol',
        [fn('COUNT', col('symbol')), 'holders'],
        [fn('SUM', col('count')), 'transfers']
      ],
      group: 'symbol',
      where: {
        balance: {
          [Op.gt]: 0
        }
      }
    });
  }

  // @Deprecated: can not deal the holders which balance > 0 and add the all transfers count
  // use getHoldersAndTransfersCountBySymbol instead
  static async getSymbolCount(symbol) {
    const result = await Balance.findOne({
      attributes: [
        [fn('COUNT', 1), 'holders'],
        [fn('SUM', col('count')), 'transfers']
      ],
      where: {
        symbol
      }
    });
    if (!result) {
      return {};
    }
    return result.toJSON();
  }

  static async getHoldersAndTransfersCountBySymbol(symbol) {
    const holdersPromise = Balance.getHoldersBySymbol(symbol);
    const transfersCountPromise = Balance.getTransfersCountBySymbol(symbol);
    const result = await Promise.all([holdersPromise, transfersCountPromise]);
    return {
      ...result[0],
      ...result[1]
    };
  }

  static async getHoldersBySymbol(symbol) {
    const result = await Balance.findOne({
      attributes: [
        [fn('COUNT', 1), 'holders'],
      ],
      where: {
        symbol,
        balance: {
          [Op.gt]: 0
        }
      }
    });
    if (!result) {
      return {};
    }
    return result.toJSON();
  }

  static async getTransfersCountBySymbol(symbol) {
    const result = await Balance.findOne({
      attributes: [
        [fn('SUM', col('count')), 'transfers']
      ],
      where: {
        symbol
      }
    });
    if (!result) {
      return {};
    }
    return result.toJSON();
  }
}

Balance.init(balanceDescription, {
  ...scanModelOptions,
  tableName: 'balance'
});

module.exports = {
  Balance,
  balanceDescription
};
