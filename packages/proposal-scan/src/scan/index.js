/**
 * @file scanner
 * @author atom-yang
 */
/* eslint-disable */
const lodash = require('lodash');
const {
  Scheduler
} = require('aelf-block-scan');
const {
  ScanCursor
} = require('viewer-orm/model/scanCursor');
const {
  Transactions
} = require('viewer-orm/model/transactions');
const {
  Proposal
} = require('viewer-orm/model/proposal');
const {
  ProposalList
} = require('viewer-orm/model/proposalList');
const {
  Votes
} = require('viewer-orm/model/votes');
const {
  Organizations
} = require('viewer-orm/model/organizations');
const {
  Proposers
} = require('viewer-orm/model/proposers');
const {
  ContractNames
} = require('viewer-orm/model/contractNames');
const config = require('../config');

const defaultOptions = {
  pageSize: 50,
  concurrentQueryLimit: 5
};

class Scanner {
  constructor(options = defaultOptions) {
    this.options = {
      ...defaultOptions,
      ...options
    };
    this.scheduler = new Scheduler({
      interval: options.proposalInterval
    });
  }

  async init() {
    await this.loop();
  }

  async getMaxId() {
    const result = await Transactions.getMaxId();
    if (!result) {
      return 0;
    }
    return result.id;
  }

  async loop() {
    console.log('start querying in loop');
    this.scheduler.setCallback(async () => {
      const currentMaxId = await this.getMaxId();
      const lastIncId = await ScanCursor.getLastId(config.scannerName);
      if (+currentMaxId === +lastIncId) {
        console.log('jump this loop');
        return;
      }
      // todo: 替换address to
      const results = await Transactions.getTransactionsById(lastIncId, currentMaxId, this.addressTo);
      console.log(results);
      await ScanCursor.updateLastIncId(currentMaxId, config.scannerName);
    });
    this.scheduler.startTimer();
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

module.exports = Scanner;
