/**
 * @file dbOperation
 * @author atom-yang
 */
const {
  DBBaseOperation,
  QUERY_TYPE
} = require('aelf-block-scan');
const {
  ScanCursor
} = require('viewer-orm/model/scanCursor');
const config = require('../config');
const {
  asyncFilter
} = require('../utils');
const {
  isProposalCreated,
  proposalCreatedInsert,
  proposalVotedReducer,
  proposalVotedInsert,
  proposalReleasedInsert
} = require('../formatter/proposal');
const {
  organizationCreatedInsert,
  organizationUpdatedInsert
} = require('../formatter/organization');
const {
  SCAN_TAGS
} = require('../config/constants');

const INSERT_PHASE = [
  {
    desc: 'organization created',
    tag: SCAN_TAGS.ORGANIZATION_CREATED,
    // filter: isOrganizationRelated,
    insert: organizationCreatedInsert
  },
  {
    desc: 'proposal created',
    tag: SCAN_TAGS.PROPOSAL_CREATED,
    filter: isProposalCreated,
    insert: proposalCreatedInsert,
  },
  {
    desc: 'proposal voted',
    tag: SCAN_TAGS.PROPOSAL_VOTED,
    // filter: isProposalVoted,
    reducer: proposalVotedReducer,
    insert: proposalVotedInsert
  },
  {
    desc: 'proposal released',
    tag: SCAN_TAGS.PROPOSAL_RELEASED,
    // filter: isProposalReleased,
    insert: proposalReleasedInsert
  },
  {
    desc: 'organization updated',
    tag: SCAN_TAGS.ORGANIZATION_UPDATED,
    // filter: isOrganizationUpdated,
    insert: organizationUpdatedInsert
  }
];

class Operation extends DBBaseOperation {
  constructor(option) {
    super(option);
    this.lastTime = new Date().getTime();
  }

  init() {
    console.log('init');
  }

  async insert(data) {
    console.log('\n\n');
    const now = new Date().getTime();
    console.log(`take time ${now - this.lastTime}ms`);
    this.lastTime = now;
    const {
      type,
      bestHeight,
      LIBHeight,
      largestHeight
    } = data;
    console.log(`largest height ${largestHeight}`);
    switch (type) {
      case QUERY_TYPE.INIT:
        console.log('INIT');
        break;
      case QUERY_TYPE.MISSING:
        console.log('MISSING');
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
        await this.insertData(data);
        break;
      case QUERY_TYPE.ERROR:
        console.log('ERROR');
        break;
      default:
        break;
    }
  }

  removeBlocksAfterLIB(blocks = [], LIBHeight) {
    return (blocks || []).filter(block => +block.Header.Height <= +LIBHeight);
  }

  addTime(block, transactions) {
    const {
      Header: {
        Height,
        Time
      }
    } = block;
    const blockTime = +Height === 1 ? config.chainInitTime : Time;
    return transactions.map(v => ({ ...v, time: blockTime }));
  }

  async insertData(data) {
    const {
      results,
      // bestHeight,
      largestHeight,
      LIBHeight,
      type
    } = data;
    // eslint-disable-next-line no-restricted-syntax
    for (const processor of INSERT_PHASE) {
      const {
        filter,
        reducer,
        insert,
        tag,
        desc
      } = processor;
      console.log(`handle ${desc}`);
      const {
        blocks = []
      } = results[tag];
      const filteredBlocks = this.removeBlocksAfterLIB(blocks, LIBHeight);
      const transactions = filteredBlocks
        .reduce((acc, v) => {
          let {
            transactionList = []
          } = v;
          transactionList = this.addTime(v, transactionList);
          return acc.concat(transactionList || []);
        }, []);
      let filtered = transactions;
      if (filter) {
        // eslint-disable-next-line no-await-in-loop
        filtered = await asyncFilter(transactions, filter);
      }
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
    if (type !== QUERY_TYPE.MISSING) {
      await ScanCursor.updateLastIncId(Math.min(+LIBHeight, +largestHeight) || 0, config.scannerName);
    }
  }

  destroy() {}
}

module.exports = Operation;