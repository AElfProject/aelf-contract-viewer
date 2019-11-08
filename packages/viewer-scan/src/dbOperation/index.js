/**
 * @file db operation
 * @author atom-yang
 */
const {
  DBBaseOperation,
  QUERY_TYPE
} = require('aelf-block-scan');
const {
  Blocks
} = require('viewer-orm/model/blocks');
const {
  Code
} = require('viewer-orm/model/code');
const {
  Contracts
} = require('viewer-orm/model/contracts');
const {
  sequelize
} = require('viewer-orm/common');
const {
  isContractDeployedOrUpdated,
  contractTransactionFormatted
} = require('../utils');
const config = require('../config');

class DBOperation extends DBBaseOperation {
  constructor(option) {
    super(option);
    this.lastTime = new Date().getTime();
  }

  init() {
    console.log('init');
  }

  async insert(data) {
    const now = new Date().getTime();
    console.log(`take time ${now - this.lastTime}ms`);
    this.lastTime = now;
    const {
      blocks,
      txs,
      type,
      bestHeight,
      LIBHeight
    } = data;
    switch (type) {
      case QUERY_TYPE.INIT:
        console.log('INIT');
        break;
      case QUERY_TYPE.MISSING:
        await this.insertData(data);
        break;
      case QUERY_TYPE.GAP:
        console.log('GAP');
        console.log('LIBHeight', LIBHeight);
        await this.insertData(data);
        break;
      case QUERY_TYPE.LOOP:
        console.log('LOOP');
        console.log('bestHeight', bestHeight);
        console.log('LIBHeight', LIBHeight);
        await this.insertLoop(data);
        break;
      case QUERY_TYPE.ERROR:
        console.log('ERROR', data);
        break;
      default:
        break;
    }
    console.log('blocks length', blocks.length);
    console.log('transactions length', txs.reduce((acc, i) => acc.concat(i), []).length);
    if (blocks.length > 0) {
      console.log('highest height', blocks[blocks.length - 1].Header.Height);
    }
    console.log('\n\n');
  }

  async insertData(data) {
    if (data.blocks.length === 0) {
      return;
    }
    let lastHeight = await Blocks.getLastHeight();
    if (lastHeight === 0) {
      await Blocks.insertHeight(1);
    }
    lastHeight = lastHeight.length > 0 ? parseInt(lastHeight[0].lastBlockHeight, 10) : 0;
    const blocks = data.blocks.filter(v => parseInt(v.Header.Height, 10) > lastHeight);
    const txs = data.txs.filter((v, i) => parseInt(data.blocks[i].Header.Height, 10) > lastHeight);
    if (blocks.length === 0) {
      return;
    }
    let maxHeight = 0;
    blocks.forEach(v => {
      if (parseInt(v.Header.Height, 10) > maxHeight) {
        maxHeight = parseInt(v.Header.Height, 10);
      }
    });
    let transactionList = [];
    /* eslint-disable arrow-body-style */
    transactionList = await Promise.all(txs.map((transactions, index) => {
      return Promise.all(transactions.filter(isContractDeployedOrUpdated).map(transaction => {
        return contractTransactionFormatted(transaction).then(result => {
          let contractTime = blocks[index].Header.Time;
          contractTime = contractTime.startsWith('1970') ? config.chainInitTime : contractTime;
          return result.map(v => ({
            ...v,
            time: contractTime
          }));
        });
      }));
    }));
    /* eslint-enable arrow-body-style */
    transactionList = transactionList.reduce((acc, i) => acc.concat(i), []).reduce((acc, i) => acc.concat(i), []);
    if (transactionList.length > 0) {
      console.log(transactionList.length);
    }
    sequelize.transaction(t => Blocks.updateLastBlockHeight(maxHeight, { transaction: t })
      .then(() => Promise.all(transactionList.map(v => {
        if (v.eventName === 'ContractDeployed') {
          return Contracts.create({
            address: v.address,
            category: v.category,
            author: v.author,
            isSystemContract: v.isSystemContract,
            serial: v.serialNumber,
            updateTime: v.time
          }, { transaction: t });
        }
        return Contracts.update({
          category: v.category,
          author: v.author,
          isSystemContract: v.isSystemContract,
          serial: v.serialNumber,
          updateTime: v.time
        }, {
          where: {
            address: v.address
          }
        }, { transaction: t });
      }))).then(() => Code.bulkCreate(transactionList.map(v => ({
        address: v.address,
        codeHash: v.codeHash,
        author: v.author,
        code: v.code,
        event: v.eventName,
        txId: v.txId,
        blockHeight: v.blockHeight,
        updateTime: v.time
      }))))).then(() => {
      console.log('committed');
    }).catch(e => {
      console.error(e);
    });
  }

  async insertLoop(data) {
    const {
      LIBHeight,
      blocks,
      txs
    } = data;
    const confirmedData = {
      blocks: blocks.filter(v => +v.Header.Height <= LIBHeight),
      txs: txs.filter((v, i) => +blocks[i].Header.Height <= LIBHeight)
    };
    await this.insertData(confirmedData);
  }

  destroy() {
    console.log('destroy');
  }
}

module.exports = DBOperation;
