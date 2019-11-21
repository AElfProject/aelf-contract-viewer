/**
 * @file scanner
 * @author atom-yang
 */
const {
  Blocks
} = require('viewer-orm/model/blocks');
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
  sequelize
} = require('viewer-orm/common');
const {
  isContractRelated,
  isContractDeployedOrUpdated,
  contractTransactionFormatted
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
      const lastIncId = await Blocks.getLastIncId();
      if (currentMaxId - lastIncId <= this.options.buffer) {
        return;
      }
      const results = await Transactions.getTransactionsById(lastIncId, currentMaxId, this.addressTo);
      await Blocks.updateLastIncId(currentMaxId);
      if (!results || (results && results.length === 0)) {
        return;
      }
      console.log('transactions in loop', results.length);
      await this.formatAndInsert(results, currentMaxId);
    });
    this.scheduler.startTimer();
  }

  async formatAndInsert(transactions, maxId) {
    const transactionIds = transactions.filter(isContractRelated);
    let result = [];
    for (let i = 0; i < transactionIds.length; i += this.options.concurrentQueryLimit) {
      // eslint-disable-next-line no-await-in-loop
      const list = await Promise.all(
        transactionIds
          .slice(i, i + this.options.concurrentQueryLimit)
          .map(this.getTransaction)
      );
      result = [...result, ...list];
    }
    await this.insertTransaction(result, maxId);
  }

  async insertTransaction(transactions, maxId) {
    let transactionList = [];
    /* eslint-disable arrow-body-style */
    transactionList = await Promise.all(transactions.filter(isContractDeployedOrUpdated).map(transaction => {
      return contractTransactionFormatted(transaction).then(result => {
        return result.map(v => ({
          ...v
        }));
      });
    }));
    transactionList = transactionList.reduce((acc, i) => acc.concat(i), []);
    sequelize.transaction(t => Blocks.updateLastIncId(maxId, { transaction: t })
      .then(() => {
        return Promise.all(transactionList.filter(v => v.eventName === 'ContractDeployed').map(v => {
          const {
            address,
            category,
            author,
            isSystemContract,
            serialNumber,
            time
          } = v;
          return Contracts.create({
            address,
            category,
            author,
            isSystemContract,
            serial: serialNumber,
            updateTime: time
          }, { transaction: t });
        }));
      }))
      .then(() => {
        console.log('contract deployed committed');
        return sequelize.transaction(t => {
          return Promise.all(transactionList.filter(v => v.eventName !== 'ContractDeployed').map(v => {
            const {
              address,
              category,
              author,
              isSystemContract,
              serialNumber,
              time
            } = v;
            return Contracts.update({
              category,
              author,
              isSystemContract,
              serial: serialNumber,
              updateTime: time
            }, {
              where: {
                address
              }
            }, { transaction: t });
          }));
        });
      })
      .then(() => {
        console.log('contract updated committed');
        return sequelize.transaction(t => {
          return Code.bulkCreate(transactionList.map(v => ({
            address: v.address,
            codeHash: v.codeHash,
            author: v.author,
            code: v.code,
            event: v.eventName,
            txId: v.txId,
            blockHeight: v.blockHeight,
            updateTime: v.time
          })), { transaction: t });
        });
      })
      .then(() => {
        console.log('code updated');
      });
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
