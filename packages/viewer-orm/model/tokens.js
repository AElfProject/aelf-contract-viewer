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
  issueChainId: {
    type: STRING(64),
    allowNull: false,
    field: 'issue_chain_id'
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
  static async getTokenList(search = '', voteValid = false) {
    let whereCondition = {};
    if (search) {
      whereCondition = {
        symbol: {
          [Op.substring]: search
        }
      };
    }
    if (voteValid) {
      whereCondition = {
        ...whereCondition,
        totalSupply: {
          [Op.gt]: 2
        },
        supply: {
          [Op.gt]: 2
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

  static async getTokenInfo(symbol) {
    let result = await Tokens.findOne({
      where: {
        symbol
      }
    });
    if (!result) {
      return {};
    }
    result = result.toJSON();
    return {
      ...result,
      totalSupply: new Decimal(result.totalSupply).dividedBy(`1e${result.decimals}`).toNumber(),
      supply: new Decimal(result.supply).dividedBy(`1e${result.decimals}`).toNumber()
    };
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

  static async getAllToken(search) {
    let whereCondition = {};
    if (search) {
      whereCondition = {
        symbol: {
          [Op.substring]: search
        }
      };
    }
    const result = await Tokens.findAndCountAll({
      where: whereCondition
    });
    const total = result.count;
    let list = result.rows.map(v => v.toJSON());
    if (total === 0) {
      return {
        total,
        list
      };
    }
    // let tokenCount = await Balance.getCountBySymbols(); @Deprecated
    const startTime = Date.now();
    const tokenCount = await Balance.getHoldersAndTransfersCountBySymbols();
    console.log('getHoldersAndTransfersCountBySymbols time:', (Date.now() - startTime) / 1000, 's');

    const startTimeList = Date.now();
    list = list.map(v => {
      const info = tokenCount[v.symbol];
      return {
        ...v,
        totalSupply: new Decimal(v.totalSupply).dividedBy(`1e${v.decimals || 0}`)
          .toNumber()
          .toLocaleString(),
        supply: new Decimal(v.supply).dividedBy(`1e${v.decimals || 0}`)
          .toNumber()
          .toLocaleString(),
        holders: info && info.holders || 0,
        transfers: info && info.transfers || 0
      };
    }).sort((a, b) => b.holders - a.holders);
    console.log('getAllToken time:', (Date.now() - startTimeList) / 1000, 's');
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
