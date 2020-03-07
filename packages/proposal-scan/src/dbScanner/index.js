/**
 * @file scanner
 * @author atom-yang
 */
const {
  Scheduler
} = require('aelf-block-scan');
const {
  ScanCursor
} = require('viewer-orm/model/scanCursor');
const {
  Blocks
} = require('viewer-orm/model/blocks');
const {
  Transactions
} = require('viewer-orm/model/transactions');
const config = require('../config');
const {
  sleep,
  asyncFilter
} = require('../utils');
const {
  isTransactionMined
} = require('../formatter/common');
const {
  isProposalClaimed,
  proposalClaimedInsert
} = require('../formatter/proposal');

const defaultOptions = {
  pageSize: 50,
  concurrentQueryLimit: 5
};

const filterAndFormatProposal = [
  {
    desc: 'proposal claimed',
    filter: isProposalClaimed,
    insert: proposalClaimedInsert
  }
];

class DBScanner {
  constructor(options = defaultOptions) {
    this.options = {
      ...defaultOptions,
      ...options
    };
    this.formatAndInsert = this.formatAndInsert.bind(this);
    this.getTransaction = this.getTransaction.bind(this);
    this.lastIncId = 0;
    this.scheduler = new Scheduler({
      interval: options.interval
    });
  }

  async init() {
    await this.gap();
    this.loop();
  }

  async getMaxId() {
    const result = await Blocks.getHighestHeight();
    if (!result) {
      return 0;
    }
    return result.blockHeight;
  }

  async gap() {
    console.log('\nstart querying db in gap\n');
    let maxId = await this.getMaxId();
    const lastIncId = await ScanCursor.getLastId(config.dbScannerName);
    const {
      range = 1000
    } = this.options;
    for (let i = lastIncId; i <= maxId; i += range) {
      const end = Math.min(i + range, maxId);
      console.log(`query from ${i + 1} to ${end} for db in gap`);
      // eslint-disable-next-line no-await-in-loop
      await this.formatAndInsert(i, end);
      // eslint-disable-next-line no-await-in-loop
      await sleep(2000);
      // eslint-disable-next-line no-await-in-loop
      maxId = await this.getMaxId();
    }
  }

  async loop() {
    console.log('\nstart querying db in loop\n');
    this.lastIncId = await ScanCursor.getLastId(config.dbScannerName);
    this.scheduler.setCallback(async () => {
      const currentMaxId = await this.getMaxId();
      const { lastIncId } = this;
      if (+currentMaxId === +lastIncId) {
        console.log('jump this loop');
        return;
      }
      console.log(`query from ${lastIncId + 1} to ${currentMaxId} in gap`);
      await this.formatAndInsert(lastIncId, currentMaxId);
      this.lastIncId = currentMaxId;
    });
    this.scheduler.startTimer();
  }

  async formatAndInsert(start, end) {
    let filteredResult = await Transactions.getTransactionsInRange(start, end, {
      addressTo: config.contracts.referendum.address,
      method: 'ReclaimVoteToken'
    });
    filteredResult = filteredResult
      .filter(item => isTransactionMined(item.txStatus));
    if (filteredResult.length === 0) {
      await ScanCursor.updateLastIncId(end, config.dbScannerName);
      return;
    }
    console.log(`transaction length ${filteredResult.length}`);
    const proposalTransactions = await this.getTransactions(filteredResult);
    // eslint-disable-next-line no-restricted-syntax
    for (const processor of filterAndFormatProposal) {
      const {
        filter,
        reducer,
        insert,
        desc
      } = processor;
      console.log(`handle ${desc}`);
      // eslint-disable-next-line no-await-in-loop
      let filtered = await asyncFilter(proposalTransactions, filter);
      if (reducer) {
        // eslint-disable-next-line no-await-in-loop
        filtered = await reducer(filtered);
      }
      // eslint-disable-next-line no-restricted-syntax
      for (const item of filtered) {
        // eslint-disable-next-line no-await-in-loop
        await insert(item);
      }
    }
    await ScanCursor.updateLastIncId(end, config.dbScannerName);
  }

  async getTransactions(transactions = []) {
    let result = [];
    for (let i = 0; i < transactions.length; i += this.options.concurrentQueryLimit) {
      // eslint-disable-next-line no-await-in-loop
      const list = await Promise.all(
        transactions
          .slice(i, i + this.options.concurrentQueryLimit)
          .map(this.getTransaction)
      );
      result = [...result, ...list];
    }
    return result;
  }

  async getTransaction({ txId, time }) {
    const result = await this.options.aelf.chain.getTxResult(txId);
    return {
      ...result,
      time
    };
  }
}

module.exports = DBScanner;
