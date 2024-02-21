/**
 * @file get contract list
 * @author atom-yang
 */
const Decimal = require('decimal.js');
const Controller = require('../core/baseController');

const getListRules = {
  symbol: {
    type: 'string',
    required: true
  },
  pageSize: {
    type: 'int',
    convertType: 'int',
    required: false,
    default: 10
  },
  pageNum: {
    type: 'int',
    convertType: 'int',
    required: true,
    min: 1
  }
};

const getBalancesRules = {
  address: {
    type: 'string',
    required: true
  },
  search: {
    type: 'string',
    required: false
  },
  pageSize: {
    type: 'int',
    convertType: 'int',
    required: false,
    max: 100
  },
  pageNum: {
    type: 'int',
    convertType: 'int',
    required: false
  }
};

class AccountController extends Controller {

  async getAccountListBySymbol() {
    const { ctx, app } = this;
    try {
      const errors = app.validator.validate(getListRules, ctx.request.query);
      if (errors) {
        throw errors;
      }
      const {
        pageSize,
        pageNum,
        symbol
      } = ctx.request.query;
      const {
        list,
        total
      } = await app.model.Balance.getOwnerBySymbol(symbol, pageNum, pageSize);
      const tokenInfo = await app.model.Tokens.getTokenInfo(symbol);
      const {
        totalSupply = '1000000000'
      } = tokenInfo;
      const totalNum = new Decimal(totalSupply);
      this.sendBody({
        list: list.map(item => ({
          ...item,
          balance: new Decimal(item.balance).toString(),
          percentage: `${new Decimal(item.balance)
            .dividedBy(totalNum)
            .mul(100)
            .toFixed(4)}%`
        })),
        total
      });
    } catch (e) {
      this.error(e);
      this.sendBody();
    }
  }

  async getBalancesByAddress() {
    const { ctx, app } = this;
    try {
      const errors = app.validator.validate(getBalancesRules, ctx.request.query);
      if (errors) {
        throw errors;
      }
      const {
        address,
        search = '',
        pageSize,
        pageNum,
      } = ctx.request.query;

      if (pageNum && !pageSize) {
        throw Error('pageSize is required when pageNum is provided');
      }

      const list = await app.model.Balance.getBalanceByOwner(address, search, {
        pageSize,
        pageNum
      });
      this.sendBody(list);
    } catch (e) {
      this.error(e);
      this.sendBody();
    }
  }
}

module.exports = AccountController;
