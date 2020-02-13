/**
 * @file scanner
 * @author atom-yang
 */
const lodash = require('lodash');
const {
  ScanCursor
} = require('viewer-orm/model/scanCursor');
const {
  Scheduler
} = require('aelf-block-scan');
const {
  Code
} = require('viewer-orm/model/code');
const {
  Contracts
} = require('viewer-orm/model/contracts');
const {
  Transactions
} = require('viewer-orm/model/transactions');
const {
  Proposal
} = require('viewer-orm/model/proposal');
const {
  isZeroContractOrProposalReleased,
  isContractProposalCreated,
  contractTransactionFormatted,
  isContractRelated,
  proposalCreatedFormatter,
  removeFailedOrOtherMethod
} = require('../utils');
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
      interval: options.interval
    });
    this.formatAndInsert = this.formatAndInsert.bind(this);
    this.insertTransaction = this.insertTransaction.bind(this);
    this.getTransaction = this.getTransaction.bind(this);
    this.addressTo = [
      config.contracts.zero.address,
      config.contracts.parliament.address
    ];
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

  async gap() {
    const maxId = await this.getMaxId();
    const {
      pageSize,
      pageStart
    } = this.options;
    const startId = pageStart * pageSize + 1;
    if (startId >= maxId) {
      return;
    }
    let leftPages = Math.ceil((parseInt(maxId, 10) - startId) / pageSize);
    for (let pageNum = pageStart; pageNum <= leftPages; pageNum += 1) {
      console.log(`start query from id ${pageNum * pageSize + 1} to ${(pageNum + 1) * pageSize}`);
      // eslint-disable-next-line no-await-in-loop
      const results = await Transactions.getTransactionsByPage(pageSize, pageNum, this.addressTo);
      const maxIdInTransactions = results.sort((a, b) => b.id - a.id)[0].id;
      // eslint-disable-next-line no-await-in-loop
      await this.formatAndInsert(results, maxIdInTransactions);
      // eslint-disable-next-line no-await-in-loop
      const currentMaxId = await this.getMaxId();
      leftPages = Math.ceil((parseInt(currentMaxId, 10) - startId) / pageSize);
      this.lastMaxId = maxIdInTransactions;
    }
  }

  async loop() {
    console.log('start querying in loop');
    this.scheduler.setCallback(async () => {
      const currentMaxId = await this.getMaxId();
      // const lastIncId = await Blocks.getLastIncId();
      const lastIncId = await ScanCursor.getLastId(config.scannerName);
      if (currentMaxId - lastIncId <= this.options.buffer) {
        return;
      }
      let results = await Transactions.getTransactionsById(lastIncId, currentMaxId, this.addressTo);
      results = results || [];
      results = results.filter(removeFailedOrOtherMethod);
      if (!results || (results && results.length === 0)) {
        // await Blocks.updateLastIncId(currentMaxId);
        await ScanCursor.updateLastIncId(currentMaxId, config.scannerName);
        return;
      }
      console.log('transactions in loop', results.length);
      await this.formatAndInsert(
        await this.getTransactions(results)
      );
      // await Blocks.updateLastIncId(currentMaxId);
      await ScanCursor.updateLastIncId(currentMaxId, config.scannerName);
    });
    this.scheduler.startTimer();
  }

  async formatAndInsert(transactions) {
    await this.insertProposal(transactions);
    await this.insertContract(transactions);
  }

  async insertProposal(transactions) {
    const result = transactions.filter(isContractProposalCreated);
    await Proposal.bulkCreate(await Promise.all(result.map(proposalCreatedFormatter)));
  }

  async insertContract(transactions) {
    const result = transactions.filter(isZeroContractOrProposalReleased);
    await this.insertTransaction(result);
  }

  async insertTransaction(transactions) {
    /* eslint-disable arrow-body-style */
    let transactionList = await Promise.all(transactions.filter(isContractRelated).map(contractTransactionFormatted));
    transactionList = lodash.sortBy(transactionList, ['blockHeight', t => parseInt(t.serialNumber, 10)]);
    // eslint-disable-next-line no-restricted-syntax
    for (const item of transactionList) {
      const {
        codeHash,
        address,
        category,
        author,
        eventName,
        isSystemContract,
        serialNumber,
        time,
        code,
        txId,
        blockHeight,
        contractName = '',
        version = '1'
      } = item;
      const codeData = {
        address,
        codeHash,
        author,
        code,
        event: eventName,
        txId,
        blockHeight,
        version,
        contractName,
        updateTime: time
      };
      const contractUpdated = {
        category,
        author,
        contractName,
        isSystemContract,
        version,
        serial: serialNumber,
        updateTime: time
      };
      if (eventName === 'ContractDeployed') {
        contractUpdated.address = address;
        // eslint-disable-next-line no-await-in-loop
        await Contracts.create(contractUpdated);
      } else if (eventName === 'CodeUpdated') {
        // eslint-disable-next-line no-await-in-loop
        const lastUpdated = await Code.getLastUpdated(address);
        const {
          author: oldAuthor,
          contractName: oldContractName
        } = lastUpdated;
        contractUpdated.author = oldAuthor;
        codeData.author = oldAuthor;
        // 上一个name不为空并且这一次name为空的情况下，使用上次的name
        if (+oldContractName !== -1 && +contractName === -1) {
          contractUpdated.contractName = oldContractName;
        }
        // eslint-disable-next-line no-await-in-loop
        await Contracts.update(contractUpdated, {
          where: {
            address
          }
        });
      } else if (eventName === 'AuthorChanged') {
        // 作者更新，一般来说不需要走提案，只更新作者，代码，版本，codeHash都需要数据从上一条拿
        // eslint-disable-next-line no-await-in-loop
        const lastUpdated = await Code.getLastUpdated(address);
        const {
          codeHash: oldCodeHash,
          code: oldCode,
          version: oldVersion,
          contractName: oldContractName
        } = lastUpdated;
        codeData.codeHash = oldCodeHash;
        codeData.code = oldCode;
        codeData.version = oldVersion;
        codeData.contractName = oldContractName;
        // eslint-disable-next-line no-await-in-loop
        await Contracts.update(contractUpdated, {
          where: {
            address
          }
        });
      }
      // eslint-disable-next-line no-await-in-loop
      await Code.create(codeData);
    }
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
