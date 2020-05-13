/**
 * @file transactions model
 * @author atom-yang
 */
const Sequelize = require('sequelize');
const Decimal = require('decimal.js');
const { scanModelOptions } = require('../common/scan');

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
  tx_id: {
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
}

Tokens.init(tokensDescription, {
  ...scanModelOptions,
  tableName: 'contract_aelf20'
});

module.exports = {
  Tokens,
  tokensDescription
};
