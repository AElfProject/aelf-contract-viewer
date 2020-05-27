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
  TOKEN_TRANSFERRED_EVENT
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

async function getTokenInfo(symbols, maxQuery = 3) {
  let results = [];
  for (let i = 0; i < symbols.length; i += maxQuery) {
    results = [
      ...results,
      // eslint-disable-next-line no-await-in-loop,max-len
      ...(await Promise.all(symbols.slice(i, i + maxQuery).map(async v => {
        let result;
        try {
          result = await config
            .contracts
            .token
            .contract
            .GetTokenInfo.call({
              symbol: v
            });
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

const TOKEN_SUPPLY_CHANGED_EVENTS = [
  'Issued',
  'Burned',
  'CrossChainTransferred',
  'CrossChainReceived'
];

async function changeSupply(symbols) {
  const tokenInfo = await getTokenInfo(symbols);
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
  const supplyChanged = addressSymbols.filter(v => TOKEN_SUPPLY_CHANGED_EVENTS.includes(v.action));
  if (supplyChanged.length > 0) {
    await changeSupply(supplyChanged.map(v => v.symbol));
  }
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

module.exports = {
  tokenBalanceChangedInsert,
  transferredInsert
};
