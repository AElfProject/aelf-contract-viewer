/**
 * @file account formatter
 */
const Decimal = require('decimal.js');
const lodash = require('lodash');
const {
  Balance
} = require('viewer-orm/model/balance');
const {
  Transfer
} = require('viewer-orm/model/transfer');
const {
  Tokens
} = require('viewer-orm/model/tokens');
const {
  sequelize
} = require('viewer-orm/common/viewer');
const {
  QUERY_TYPE
} = require('aelf-block-scan');
const {
  deserializeLogs
} = require('../utils');
const {
  TOKEN_BALANCE_CHANGED_EVENT,
  TOKEN_TRANSFERRED_EVENT,
  TOKEN_SUPPLY_CHANGED_EVENT
} = require('../config/constants');
const config = require('../config');

function deserializeTransferredLogs(transaction, filters) {
  const {
    Logs = []
  } = transaction;
  return Promise.all(
    filters
      .map(f => {
        const {
          formatter,
          filterText
        } = f;
        return deserializeLogs(Logs, filterText)
          .then(res => res.map(r => formatter(r.deserializeLogResult, transaction)));
      })
  );
}

async function getBalances(paramsArr, maxQuery = 3) {
  let results = [];
  for (let i = 0; i < paramsArr.length; i += maxQuery) {
    results = [
      ...results,
      // eslint-disable-next-line no-await-in-loop,max-len
      ...(await Promise.all(paramsArr.slice(i, i + maxQuery).map(v => config.contracts.token.contract.GetBalance.call(v))))
    ];
  }
  return results;
}

const TOKEN_INFO = {};

async function getTokenInfo(symbols, type, maxQuery = 3) {
  let results = [];
  for (let i = 0; i < symbols.length; i += maxQuery) {
    results = [
      ...results,
      // eslint-disable-next-line no-await-in-loop,max-len
      ...(await Promise.all(symbols.slice(i, i + maxQuery).map(async v => {
        let result;
        try {
          if (type === QUERY_TYPE.LOOP || !TOKEN_INFO[v]) {
            result = await config
              .contracts
              .token
              .contract
              .GetTokenInfo.call({
                symbol: v
              });
            TOKEN_INFO[v] = result;
          } else {
            result = TOKEN_INFO[v];
          }
        } catch (e) {
          result = {
            symbol: v,
            supply: 0
          };
        }
        return result;
      })))
    ];
  }
  return results;
}

let TOKEN_DECIMALS = {};
let FETCHING_TOKEN_LIST = false;

async function getTokenDecimal(symbol) {
  console.log('getTokenDecimal: ', symbol);
  if (
    Object.keys(TOKEN_DECIMALS).length === 0
  ) {
    if (!FETCHING_TOKEN_LIST) {
      FETCHING_TOKEN_LIST = Tokens.getTokenList();
    }
    const tokenList = await FETCHING_TOKEN_LIST;
    TOKEN_DECIMALS = {
      ...TOKEN_DECIMALS,
      ...tokenList.reduce((acc, t) => {
        const data = t.toJSON ? t.toJSON() : t;
        return {
          ...acc,
          [data.symbol]: data.decimals
        };
      }, {})
    };
  } else if (!TOKEN_DECIMALS[symbol]) {
    const {
      decimals: tokenDecimals
    } = await config.contracts.token.contract.GetTokenInfo.call({
      symbol
    });
    TOKEN_DECIMALS[symbol] = tokenDecimals;
  }
  return TOKEN_DECIMALS[symbol];
}

async function calculateBalances(symbol, balance) {
  const decimal = await getTokenDecimal(symbol);
  return new Decimal(balance).dividedBy(`1e${decimal || 8}`).toString();
}

async function changeSupply(symbols, type) {
  let tokenInfo = await getTokenInfo(symbols, type);
  console.log('changeSupply', JSON.stringify(tokenInfo));
  tokenInfo = tokenInfo.filter(item => !!item);
  if (!tokenInfo.length) {
    console.log('changeSupply failed', tokenInfo, symbols);
    return null;
  }
  return Promise.all(tokenInfo.map(v => Tokens.updateTokenSupply(v.symbol, v.supply)));
}

let BALANCES_NOT_IN_LOOP = {};

async function tokenBalanceChangedFormatter(transaction, type) {
  const {
    time
  } = transaction;
  let addressSymbols = await deserializeTransferredLogs(transaction, TOKEN_BALANCE_CHANGED_EVENT);
  addressSymbols = addressSymbols
    .reduce((acc, v) => [...acc, ...v], [])
    .reduce((acc, v) => [...acc, ...v], []);
  // const supplyChanged = addressSymbols.filter(v => TOKEN_SUPPLY_CHANGED_EVENTS.includes(v.action));
  // if (supplyChanged.length > 0) {
  //   await changeSupply(supplyChanged.map(v => v.symbol));
  // }
  // TODO: 用来排除非法的Token名称或者用户自定义的Token名称
  addressSymbols = addressSymbols.filter(v => v.symbol.match(/^[a-z0-9]+$/i));
  addressSymbols = lodash.uniq(addressSymbols.map(v => `${v.owner}_${v.symbol}`));
  const balancesFromCache = addressSymbols
    .filter(v => type !== QUERY_TYPE.LOOP && BALANCES_NOT_IN_LOOP[v] !== undefined)
    .map(key => ({
      owner: key.split('_')[0],
      symbol: key.split('_')[1],
      balance: BALANCES_NOT_IN_LOOP[key]
    }));

  addressSymbols = addressSymbols
    .filter(v => (type !== QUERY_TYPE.LOOP && BALANCES_NOT_IN_LOOP[v] === undefined)
      || type === QUERY_TYPE.LOOP)
    .map(v => ({
      owner: v.split('_')[0],
      symbol: v.split('_')[1]
    }));
  let balances = await getBalances(addressSymbols);
  balances = await Promise.all(balances.map(async item => {
    const {
      balance,
      symbol
    } = item;
    return {
      ...item,
      balance: await calculateBalances(symbol, balance)
    };
  }));
  BALANCES_NOT_IN_LOOP = {
    ...BALANCES_NOT_IN_LOOP,
    ...balances.reduce((acc, v) => ({
      ...acc,
      [`${v.owner}_${v.symbol}`]: v.balance
    }), {})
  };
  return [...balances, ...balancesFromCache].map(b => ({
    ...b,
    updatedAt: time
  }));
}

function tokenBalanceChangedInserter(formattedData) {
  return sequelize.transaction(t => Promise.all(formattedData.map(data => Balance.addOrCreate(data, t))));
}

async function tokenBalanceChangedInsert(transaction, type) {
  const formattedData = await tokenBalanceChangedFormatter(transaction, type);
  return tokenBalanceChangedInserter(formattedData);
}

async function transferredFormatter(transaction) {
  const {
    TransactionId
  } = transaction;
  let transferInfo = await deserializeTransferredLogs(transaction, TOKEN_TRANSFERRED_EVENT);
  transferInfo = transferInfo.reduce((acc, v) => [...acc, ...v], []);
  // TODO: 用来排除非法的Token名称或者用户自定义的Token名称
  transferInfo = transferInfo.filter(v => v.symbol.match(/^[a-z0-9]+$/i));
  return Promise.all(transferInfo.map(async item => {
    const {
      amount,
      symbol
    } = item;
    const quantity = await calculateBalances(symbol, amount);
    return {
      ...item,
      amount: quantity,
      txId: TransactionId
    };
  }));
}

function transferredInserter(formattedData) {
  return sequelize.transaction(t => Transfer.bulkCreate(formattedData, {
    transaction: t
  }));
}

async function transferredInsert(transaction, type) {
  const formattedData = await transferredFormatter(transaction, type);
  return transferredInserter(formattedData);
}

async function tokenSupplyChangedInsert(transaction, type) {
  let list = await deserializeTransferredLogs(transaction, TOKEN_SUPPLY_CHANGED_EVENT);
  list = lodash.uniq(list.reduce((acc, v) => [...acc, ...v], []));
  await changeSupply(list, type);
}

module.exports = {
  tokenBalanceChangedInsert,
  tokenSupplyChangedInsert,
  transferredInsert
};
