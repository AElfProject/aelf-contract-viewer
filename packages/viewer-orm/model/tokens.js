/**
 * @file transactions model
 * @author atom-yang
 */
const Sequelize = require('sequelize');
const Decimal = require('decimal.js');
const { scanModelOptions } = require('../common/scan');
const {
  Balance
} = require('./balance');

const {
  Model,
  BIGINT,
  STRING,
  Op
} = Sequelize;

const tokensDescription = {
  id: {
    type: BIGINT,
    allowNull: false,
    primaryKey: true,
    field: 'id'
  },
  contractAddress: {
    type: STRING(255),
    allowNull: false,
    field: 'contract_address'
  },
  symbol: {
    type: STRING(255),
    allowNull: false,
    field: 'symbol'
  },
  chainId: {
    type: STRING(64),
    allowNull: false,
    field: 'chain_id'
  },
  txId: {
    type: STRING(64),
    allowNull: false,
    field: 'tx_id'
  },
  name: {
    type: STRING(255),
    allowNull: false,
    field: 'name'
  },
  totalSupply: {
    type: BIGINT,
    allowNull: false,
    field: 'total_supply'
  },
  supply: {
    type: BIGINT,
    allowNull: false,
    field: 'supply'
  },
  decimals: {
    type: BIGINT,
    allowNull: false,
    field: 'decimals'
  }
};

class Tokens extends Model {
  static async getTokenList(search = '') {
    let whereCondition = {};
    if (search) {
      whereCondition = {
        symbol: {
          [Op.substring]: search
        }
      };
    }
    const list = await Tokens.findAll({
      attributes: ['symbol', 'decimals', 'totalSupply'],
      where: whereCondition,
      order: [
        ['id', 'ASC']
      ]
    });
    return (list || []).map(v => ({
      ...v.toJSON(),
      totalSupply: new Decimal(v.totalSupply).dividedBy(`1e${v.decimals}`).toString()
    }));
  }

  static getTokenInfo(symbol) {
    return Tokens.findOne({
      where: {
        symbol
      }
    });
  }

  static async getTokenDecimal(symbol) {
    const result = await Tokens.findOne({
      attributes: ['decimals'],
      where: {
        symbol
      }
    });
    if (result) {
      return result.toJSON().decimals;
    }
    return 8;
  }

  static updateTokenSupply(symbol, supply) {
    return Tokens.update({
      supply
    }, {
      where: {
        symbol
      }
    });
  }

  static async getAllToken(pageNum, pageSize) {
    const offset = (pageNum - 1) * pageSize;
    let tokenCount = await Balance.getTokenCount();
    const total = tokenCount.length;
    tokenCount = tokenCount.sort((a, b) => b.holders - a.holders);
    const tokenSymbols = tokenCount.slice(offset, offset + pageSize);
    const result = await Tokens.findAll({
      where: {
        symbol: {
          [Op.in]: tokenSymbols.map(v => v.symbol)
        }
      }
    });
    const list = result.rows.map(v => v.toJSON());
    return {
      total,
      list
    };
  }
}

Tokens.init(tokensDescription, {
  ...scanModelOptions,
  tableName: 'contract_aelf20'
});

module.exports = {
  Tokens,
  tokensDescription
};
