/**
 * @file scanner
 * @author atom-yang
 */
const Sequelize = require('sequelize');
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
const {
  Organizations
} = require('viewer-orm/model/organizations');
const config = require('../config');
const {
  sleep,
  asyncFilter
} = require('../utils');
const {
  isTransactionMined
} = require('../formatter/common');
const {
  isProposalRelated,
  isProposalCreated,
  proposalCreatedInsert,
  isProposalVoted,
  proposalVotedReducer,
  proposalVotedInsert,
  isProposalReleased,
  proposalReleasedInsert,
  isProposalClaimed,
  proposalClaimedInsert
} = require('../formatter/proposal');
const {
  isOrganizationRelated,
  isOrganizationCreated,
  organizationCreatedInsert,
  isOrganizationUpdated,
  organizationUpdatedInsert,
  organizationCreatedInserter
} = require('../formatter/organization');

const defaultOptions = {
  pageSize: 50,
  concurrentQueryLimit: 5
};

const {
  Op
} = Sequelize;

const filterAndFormatProposal = [
  {
    desc: 'organization created',
    filter: isOrganizationCreated,
    insert: organizationCreatedInsert
  },
  {
    desc: 'proposal created',
    filter: isProposalCreated,
    insert: proposalCreatedInsert,
  },
  {
    desc: 'proposal voted',
    filter: isProposalVoted,
    reducer: proposalVotedReducer,
    insert: proposalVotedInsert
  },
  {
    desc: 'proposal released',
    filter: isProposalReleased,
    insert: proposalReleasedInsert
  },
  {
    desc: 'organization updated',
    filter: isOrganizationUpdated,
    insert: organizationUpdatedInsert
  },
  {
    desc: 'proposal claimed',
    filter: isProposalClaimed,
    insert: proposalClaimedInsert
  }
];

class Scanner {
  constructor(options = defaultOptions) {
    this.options = {
      ...defaultOptions,
      ...options
    };
    this.formatAndInsert = this.formatAndInsert.bind(this);
    this.getTransaction = this.getTransaction.bind(this);
    this.lastIncId = 0;
    this.scheduler = new Scheduler({
      interval: options.proposalInterval
    });
  }

  async init() {
    await this.insertDefaultOrganization();
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

  // todo: 有多少内置组织地址
  async insertDefaultOrganization() {
    const {
      controller
    } = config;
    // 去重
    const defaultOrganizations = Object.values([
      {
        contractAddress: config.contracts.parliament.address,
        ownerAddress: config.contracts.parliament.defaultOrganizationAddress
      },
      ...Object.values(controller)
    ].reduce((acc, v) => ({
      ...acc,
      [v.ownerAddress]: v
    }), {}));
    const results = await Promise.all(defaultOrganizations.map(async item => {
      const {
        ownerAddress,
        contractAddress
      } = item;
      const isExistOrg = await Organizations.isExist(ownerAddress);
      if (!isExistOrg) {
        const { contract } = config
          .contracts[config.constants.addressProposalTypesMap[contractAddress].toLowerCase()];
        const organizationInfo = await contract.GetOrganization.call(ownerAddress);
        const {
          organizationAddress,
          organizationHash,
          proposalReleaseThreshold,
          ...leftOrgInfo
        } = organizationInfo;
        return {
          orgAddress: organizationAddress,
          orgHash: organizationHash,
          releaseThreshold: proposalReleaseThreshold,
          leftOrgInfo,
          createdAt: config.chainInitTime,
          proposalType: config.constants.addressProposalTypesMap[contractAddress],
          creator: config.contracts.zero.address,
          txId: 'inner'
        };
      }
      return false;
    })).then(list => list.filter(item => item));
    await organizationCreatedInserter(results);
  }

  async gap() {
    console.log('\nstart querying in gap\n');
    let maxId = await this.getMaxId();
    const lastIncId = await ScanCursor.getLastId(config.scannerName);
    const {
      range = 1000
    } = this.options;
    for (let i = lastIncId; i <= maxId; i += range) {
      const end = Math.min(i + range, maxId);
      console.log(`query from ${i + 1} to ${end} in gap`);
      // eslint-disable-next-line no-await-in-loop
      await this.formatAndInsert(i, end);
      // eslint-disable-next-line no-await-in-loop
      await sleep(2000);
      // eslint-disable-next-line no-await-in-loop
      maxId = await this.getMaxId();
    }
  }

  async loop() {
    console.log('\nstart querying in loop\n');
    this.lastIncId = await ScanCursor.getLastId(config.scannerName);
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
      addressTo: {
        [Op.in]: [
          config.contracts.parliament.address,
          config.contracts.referendum.address,
          config.contracts.association.address,
          config.contracts.zero.address,
          config.contracts.crossChain.address
        ]
      }
    });
    filteredResult = filteredResult
      .filter(item => isTransactionMined(item.txStatus)
        && (isProposalRelated(item.method) || isOrganizationRelated(item.method)));
    if (filteredResult.length === 0) {
      await ScanCursor.updateLastIncId(end, config.scannerName);
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
    await ScanCursor.updateLastIncId(end, config.scannerName);
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
