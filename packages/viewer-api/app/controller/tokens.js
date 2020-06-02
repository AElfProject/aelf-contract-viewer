/**
 * @file get tokens list
 * @author atom-yang
 */
const Controller = require('../core/baseController');

const getListRules = {
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

const getTxListRules = {
  symbol: {
    required: true,
    type: 'string'
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

const getTokenInfoRules = {
  symbol: {
    required: true,
    type: 'string'
  }
};

class TokensController extends Controller {
  async getList() {
    const { ctx, app } = this;
    try {
      const errors = app.validator.validate(getListRules, ctx.request.query);
      if (errors) {
        throw errors;
      }
      const {
        pageSize = 10,
        pageNum
      } = ctx.request.query;
      const {
        list,
        total
      } = await app.model.Tokens.getAllToken(+pageNum, +pageSize);
      this.sendBody({
        list,
        total
      });
    } catch (e) {
      this.error(e);
      this.sendBody();
    }
  }

  async getTransactionList() {
    const { ctx, app } = this;
    try {
      const errors = app.validator.validate(getTxListRules, ctx.request.query);
      if (errors) {
        throw errors;
      }
      const {
        pageSize = 10,
        symbol,
        pageNum
      } = ctx.request.query;
      const {
        list,
        total
      } = await app.model.TokenTx.getTxList(symbol, +pageNum, +pageSize);
      this.sendBody({
        list,
        total
      });
    } catch (e) {
      this.error(e);
      this.sendBody();
    }
  }

  async getTokenInfo() {
    const { ctx, app } = this;
    try {
      const errors = app.validator.validate(getTokenInfoRules, ctx.request.query);
      if (errors) {
        throw errors;
      }
      const {
        symbol
      } = ctx.request.query;
      const tokenInfo = await app.model.Tokens.getTokenInfo(symbol);
      const balanceInfo = await app.model.Balance.getSymbolCount(symbol);
      this.sendBody({
        ...(tokenInfo || {}),
        ...balanceInfo
      });
    } catch (e) {
      this.error(e);
      this.sendBody();
    }
  }

}

module.exports = TokensController;
