/**
 * @file account formatter
 */
const Decimal = require('decimal.js');
const lodash = require('lodash');
const {
  Balance
} = require('viewer-orm/model/balance');
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
  TOKEN_BALANCE_CHANGED_EVENT
} = require('../config/constants');
const config = require('../config');


function deserializeTransferredLogs(logs) {
  return Promise.all(
    TOKEN_BALANCE_CHANGED_EVENT
      .filter(v => v.type === 'Name')
      .map(f => {
        const {
          formatter,
          filterText
        } = f;
        return deserializeLogs(logs, filterText)
          .then(res => res.map(r => formatter(r.deserializeLogResult)));
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

let TOKEN_DECIMALS = {};
let FETCHING_TOKEN_LIST = false;

async function getTokenDecimal(symbol) {
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

let BALANCES_NOT_IN_LOOP = {};

async function tokenTransferredFormatter(transaction, type) {
  const {
    Logs = [],
    time
  } = transaction;
  let addressSymbols = await deserializeTransferredLogs(Logs);
  addressSymbols = lodash.uniq(
    addressSymbols
      .reduce((acc, v) => [...acc, ...v], [])
      .reduce((acc, v) => [...acc, ...v], [])
      .map(v => `${v.owner}_${v.symbol}`)
  );
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

function tokenTransferredInserter(formattedData) {
  return sequelize.transaction(t => Promise.all(formattedData.map(data => Balance.addOrCreate(data, t))));
}

async function tokenTransferredInsert(transaction, type) {
  const formattedData = await tokenTransferredFormatter(transaction, type);
  return tokenTransferredInserter(formattedData);
}

module.exports = {
  tokenTransferredInsert
};
