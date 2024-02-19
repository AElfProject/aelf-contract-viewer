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

function getListByPage(listInfo, pageNum, pageSize) {
  const { list } = listInfo;
  const start = (pageNum - 1) * pageSize;
  const end = start + pageSize;
  return {
    ...listInfo,
    list: list.slice(start, end)
  };
}

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
        pageNum,
        search = ''
      } = ctx.request.query;
      if (pageSize > 100) {
        throw Error('pageSize should be less than 100');
      }

      const getAndUpdateCache = async function(result) {
        const updateLock = await app.redis.get('aelfContractViewer_tokenList_lock') || 'unlock';
        console.log('all token updateLock:', updateLock);
        const dataNow = Date.now();
        const interval = dataNow - (result ? JSON.parse(result).timestamp : 0);
        const cacheExpire = 60000 * 5;
        const isCacheExpire = interval > cacheExpire;
        if ((updateLock === 'unlock' && isCacheExpire) || !result) {
          const allTokenInfo = await app.model.Tokens.getAllToken(search);
          await app.redis.set('aelfContractViewer_tokenList_lock', 'locked');
          const output = {
            ...allTokenInfo,
            timestamp: Date.now()
          };
          await app.redis.set('aelfContractViewer_tokenList', JSON.stringify(output));
          await app.redis.set('aelfContractViewer_tokenList_lock', 'unlock');
          return getListByPage(output, pageNum, pageSize);
        }
      };

      const result = await app.redis.get('aelfContractViewer_tokenList');
      if (result) {
        this.sendBody(getListByPage(JSON.parse(result), pageNum, pageSize));
        getAndUpdateCache(result);
      } else {
        const output = await getAndUpdateCache(result);
        this.sendBody(output);
      }
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

  async getAllTransactionList() {
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
      // Get tokenList
      const {
        list,
        total
      } = await app.model.TokenTx.getTokenList(symbol, +pageNum, +pageSize);
      // confirmed and unConfirmed
      const ids = list.map(v => v.txId);
      const confirmedTxs = await app.model.Transactions.getTransactionsByIds(ids);
      const confirmedTxsMap = {};
      confirmedTxs.forEach(tx => {
        confirmedTxsMap[tx.txId] = tx.toJSON();
      });

      const unConfirmedTxs = await app.model.UnconfirmedTransactions.getTransactionsByIds(ids);

      const unConfirmedTxsMap = {};
      unConfirmedTxs.forEach(tx => {
        unConfirmedTxsMap[tx.txId] = tx.toJSON();
      });

      let _list = list.map(item => ({
        ...item,
        ...(unConfirmedTxsMap[item.txId] || {}),
        ...(confirmedTxsMap[item.txId] || {}),
      }));
      _list = _list.filter(item => item.addressTo && item.addressFrom);

      this.sendBody({
        list: _list,
        total,
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
      // const balanceInfo = await app.model.Balance.getSymbolCount(symbol); @Deprecated
      const balanceInfo = await app.model.Balance.getHoldersAndTransfersCountBySymbol(symbol);
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
