/**
 * @file proposal related formatter
 */
const Decimal = require('decimal.js');
const moment = require('moment');
const lodash = require('lodash');
const Sequelize = require('sequelize');
const {
  sequelize
} = require('viewer-orm/common/viewer');
const {
  Votes
} = require('viewer-orm/model/votes');
const {
  Tokens
} = require('viewer-orm/model/tokens');
const {
  ProposalList
} = require('viewer-orm/model/proposalList');
const {
  organizationCreatedInserter
} = require('./organization');
const {
  parseParams,
  deserializeLogs,
  formatTimestamp,
  deserializeContract
} = require('../utils');
const config = require('../config');

const {
  constants
} = config;

const {
  proposalTypes,
  proposalStatus,
  addressProposalTypesMap
} = constants;

const contractRelatedMethods = [
  'ProposeNewContract',
  'ProposeUpdateContract',
  'ProposeContractCodeCheck',
  'ReleaseApprovedContract',
  'ReleaseCodeCheckedContract'
];

const USER_CREATED_METHODS = [
  'CreateProposal',
  'Release'
];


function isProposalCreated(transaction) {
  const {
    Transaction,
  } = transaction;
  const {
    To,
    MethodName
  } = Transaction;
  return !(To === config.contracts.crossChain.address && MethodName === 'ProposeCrossChainIndexing');
}

const SYSTEM_PROPOSAL_EXPIRATION_TIME = 60 * 60 * 24; // seconds
const SYSTEM_PROPOSAL_METHODS_MAP = {
  // ProposeContractCodeCheck: ['DeploySmartContract', 'UpdateSmartContract'],
  ProposeNewContract: 'ProposeContractCodeCheck',
  ProposeUpdateContract: 'ProposeContractCodeCheck',
  RequestSideChainCreation: 'CreateSideChain'
};

// eslint-disable-next-line no-unused-vars
async function organizationNotFound(orgAddress, proposalType) {
  const time = config.chainInitTime;
  const txId = 'inner';
  const orgInfo = config.contracts[proposalType.toLowerCase()].contract.GetOrganization.call(orgAddress);
  const {
    organizationAddress,
    organizationHash: orgHash,
    proposalReleaseThreshold: releaseThreshold,
    ...leftOrgInfo
  } = orgInfo;
  await organizationCreatedInserter([
    {
      orgAddress,
      orgHash,
      releaseThreshold,
      leftOrgInfo,
      createdAt: time,
      proposalType,
      creator: config.contracts.zero.address,
      txId
    }
  ]);
}

const PROPOSAL_CREATED_INPUT = Object.keys(config.contracts.parliament.contract.CreateProposal.inputTypeInfo.fields);

async function proposalCreatedFormatter(transaction) {
  const {
    Logs = [],
    TransactionId,
    Transaction,
    time
  } = transaction;
  const {
    From,
    To,
    Params,
    MethodName
  } = Transaction;
  const logResults = await deserializeLogs(Logs, 'ProposalCreated');
  return Promise.all(logResults.map(async item => {
    const {
      deserializeLogResult,
      contractAddress
    } = item;
    const {
      proposalId
    } = deserializeLogResult;
    const proposalType = addressProposalTypesMap[contractAddress];
    // proposal已经被释放的情况下，无法查询到提案的相关信息
    let result = {
      createTxId: TransactionId,
      createAt: time,
      proposalId,
      createdBy: USER_CREATED_METHODS.includes(MethodName) ? 'USER' : 'SYSTEM_CONTRACT',
      isContractDeployed: contractRelatedMethods.includes(MethodName),
      proposalType
    };
    let contractMethodName;
    let params;
    let proposalInfo = {
      toBeReleased: false,
      proposer: From
    };
    // eslint-disable-next-line max-len
    const proposalInfoFromChain = await config.contracts[proposalType.toLowerCase()].contract.GetProposal.call(proposalId);
    if (proposalInfoFromChain) {
      proposalInfo = {
        ...proposalInfo,
        ...proposalInfoFromChain,
        expiredTime: formatTimestamp(proposalInfoFromChain.expiredTime)
      };
    }
    switch (MethodName) {
      case 'CreateProposal':
        proposalInfo = {
          ...proposalInfo,
          ...parseParams(Params)
        };
        break;
      case 'RequestSideChainCreation':
      case 'ProposeContractCodeCheck':
      case 'ProposeNewContract':
      case 'ProposeUpdateContract':
        contractMethodName = SYSTEM_PROPOSAL_METHODS_MAP[MethodName];
        params = Params;
        if (MethodName === 'ProposeContractCodeCheck') {
          const parsedParams = parseParams(Params);
          contractMethodName = parsedParams.isContractDeployment ? 'DeploySmartContract' : 'UpdateSmartContract';
          params = JSON.stringify(await deserializeContract(
            config.contracts.zero.address,
            contractMethodName,
            parsedParams.contractInput
          ));
        }
        proposalInfo = {
          ...proposalInfo,
          contractMethodName,
          params,
          organizationAddress: config.controller[MethodName].ownerAddress,
          toAddress: To,
          expiredTime: proposalInfo.expiredTime || moment(time).add(SYSTEM_PROPOSAL_EXPIRATION_TIME, 'second')
        };
        break;
      case 'ReleaseApprovedContract':
        // eslint-disable-next-line no-case-declarations
        const parsedParams = parseParams(Params);
        // eslint-disable-next-line no-case-declarations
        const {
          contractParams
        } = await ProposalList.getAllProposalInfo(parsedParams.proposalId);
        // eslint-disable-next-line no-case-declarations
        const {
          address
        } = JSON.parse(contractParams);
        proposalInfo = {
          ...proposalInfo,
          contractMethodName: address && address.length > 0 ? 'UpdateSmartContract' : 'DeploySmartContract',
          params: contractParams,
          organizationAddress: config.controller.ProposeContractCodeCheck.ownerAddress,
          toAddress: config.contracts.zero.address,
          expiredTime: proposalInfo.expiredTime || moment(time).add(SYSTEM_PROPOSAL_EXPIRATION_TIME, 'second')
        };
        break;
      default:
        // eslint-disable-next-line no-case-declarations,max-len
        if (!proposalInfoFromChain) {
          return {};
        }
    }
    const {
      contractMethodName: contractMethod,
      toAddress,
      params: contractParams,
      expiredTime,
      organizationAddress,
      proposer,
      toBeReleased,
      ...leftInfo
    } = proposalInfo;
    const filteredLeft = Object.keys(leftInfo).reduce((acc, key) => {
      if (PROPOSAL_CREATED_INPUT.includes(key)) {
        return {
          ...acc,
          [key]: leftInfo[key]
        };
      }
      return acc;
    }, {});
    result = {
      ...result,
      orgAddress: organizationAddress,
      proposer,
      contractAddress: toAddress,
      contractMethod,
      contractParams,
      leftInfo: filteredLeft,
      expiredTime: formatTimestamp(expiredTime).utcOffset(0).format(),
      status: toBeReleased ? proposalStatus.APPROVED : proposalStatus.PENDING
    };
    return result;
  }))
    .then(results => results.filter(v => Object.keys(v).length > 0));
}

async function proposalCreatedInsert(transaction) {
  const formattedData = await proposalCreatedFormatter(transaction);
  return Promise.all(formattedData.map(item => ProposalList.findOrCreate({
    where: {
      proposalId: item.proposalId
    },
    defaults: item
  })));
}

async function proposalVotedReducer(transactionList) {
  const proposalIdsMap = transactionList.reduce((acc, item, txIndex) => {
    const {
      Logs = []
    } = item;
    let proposalIdArr = (Logs || []).reduce((ids, log) => {
      const {
        Name,
        Address
      } = log;
      if (
        [
          'ReferendumReceiptCreated',
          'ReceiptCreated'
        ].includes(Name)
        && [
          config.contracts.parliament.address,
          config.contracts.referendum.address,
          config.contracts.association.address
        ].includes(Address)
      ) {
        const proposalType = addressProposalTypesMap[Address];
        const { contract } = config.contracts[proposalType.toLowerCase()];
        const logResults = contract.deserializeLog(Logs, Address === config.contracts.referendum.address
          ? 'ReferendumReceiptCreated' : 'ReceiptCreated');
        return [...ids, ...logResults.map(v => v.proposalId)];
      }
      return ids;
    }, []);
    const result = {
      ...acc
    };
    proposalIdArr = lodash.uniq(proposalIdArr);
    proposalIdArr.forEach(id => {
      if (result[id]) {
        result[id] = [...result[id], txIndex];
      } else {
        result[id] = [txIndex];
      }
    });
    return result;
  }, {});
  const proposalIds = Object.keys(proposalIdsMap);
  console.log('proposalIds', proposalIds);
  if (proposalIds.length === 0) {
    return [];
  }
  const existIds = await ProposalList.getExistProposalIds(proposalIds);
  const txIndexes = lodash.uniq(existIds.reduce((acc, key) => [...acc, ...proposalIdsMap[key]], []));
  txIndexes.sort((pre, next) => pre - next);
  console.log('tx indexes', txIndexes);
  return txIndexes.map(index => transactionList[index]);
}

const ACTION_COUNTS_MAP = {
  Approve: 'approvals',
  Reject: 'rejections',
  Abstain: 'abstentions'
};

const ACTION_COUNTS_NAME_MAP = {
  Approve: 'approvalCount',
  Reject: 'rejectionCount',
  Abstain: 'abstentionCount'
};

async function proposalVotedFormatter(transaction) {
  const {
    Logs = [],
    TransactionId
  } = transaction;
  let logResults = await deserializeLogs(Logs, 'ReferendumReceiptCreated');
  logResults = [...logResults, ...(await deserializeLogs(Logs, 'ReceiptCreated'))];
  return Promise.all((logResults).map(async log => {
    const {
      contractAddress,
      deserializeLogResult
    } = log;
    const {
      proposalId,
      time,
      symbol = 'none',
      address: voter,
      receiptType
    } = deserializeLogResult;
    let amount = deserializeLogResult.amount || 1;
    const proposalType = addressProposalTypesMap[contractAddress];
    if (!proposalType) {
      return false;
    }
    const { contract } = config.contracts[proposalType.toLowerCase()];
    const proposalInfo = await contract.GetProposal.call(proposalId);
    let increment = !proposalInfo ? amount : proposalInfo[`${ACTION_COUNTS_NAME_MAP[receiptType]}`];
    const isExist = await ProposalList.isExist(proposalId);
    if (!isExist) {
      return false;
    }
    if (proposalType === proposalTypes.REFERENDUM) {
      const decimal = await Tokens.getTokenDecimal(symbol);
      amount = new Decimal(amount).dividedBy(`1e${decimal}`).toString();
      increment = new Decimal(increment).dividedBy(`1e${decimal}`).toString();
    }
    const result = {
      update: {
        isIncrement: !proposalInfo,
        proposalId,
        action: ACTION_COUNTS_MAP[receiptType],
        amount: increment,
        status: (proposalInfo && proposalInfo.toBeReleased)
          ? proposalStatus.APPROVED
          : proposalStatus.PENDING
      },
      vote: {
        txId: TransactionId,
        proposalId,
        voter,
        amount,
        symbol,
        action: receiptType,
        proposalType,
        time: formatTimestamp(time)
      }
    };
    return result;
  })).then(results => results.filter(item => item));
}

async function proposalVotedInsert(transaction) {
  const formattedData = await proposalVotedFormatter(transaction);
  if (formattedData.length === 0) {
    return false;
  }
  return sequelize.transaction(t => Promise.all(formattedData.map(async item => {
    const {
      update,
      vote
    } = item;
    const {
      isIncrement,
      proposalId,
      action,
      amount,
      status
    } = update;
    const [, created] = await Votes.findOrCreate({
      where: {
        voter: vote.voter,
        proposalId: vote.proposalId
      },
      defaults: {
        ...vote,
        amount: vote.proposalType !== proposalTypes.REFERENDUM ? 1 : vote.amount
      },
      transaction: t
    });
    if (created) {
      return ProposalList.update({
        status,
        // watch out increment
        [action]: isIncrement ? Sequelize.literal(`${action} + ${amount}`) : amount
      }, {
        where: {
          proposalId
        },
        transaction: t
      });
    }
    return created;
  })));
}

async function proposalReleasedFormatter(transaction) {
  const {
    Logs = [],
    TransactionId,
    time
  } = transaction;
  const logResults = await deserializeLogs(Logs, 'ProposalReleased');
  return logResults.map(item => ({
    proposalId: item.deserializeLogResult.proposalId,
    releasedTxId: TransactionId,
    releasedTime: time,
    status: proposalStatus.RELEASED
  }));
}

async function proposalReleasedInsert(transaction) {
  const formattedData = await proposalReleasedFormatter(transaction);
  return sequelize.transaction(t => Promise.all(formattedData.map(item => {
    const {
      proposalId,
      ...update
    } = item;
    return ProposalList.update(update, {
      where: {
        proposalId
      },
      transaction: t
    });
  })));
}

function isProposalClaimed(transaction) {
  const {
    Transaction,
    Status
  } = transaction;
  const {
    To,
    MethodName
  } = Transaction;
  return (Status || '').toUpperCase() === 'MINED'
    && To === config.contracts.referendum.address
    && MethodName === 'ReclaimVoteToken';
}

function proposalClaimedFormatter(transaction) {
  const {
    Transaction
  } = transaction;
  const {
    Params
  } = Transaction;
  return parseParams(Params);
}

function proposalClaimedInsert(transaction) {
  const {
    TransactionId,
    Transaction,
    time
  } = transaction;
  const {
    From
  } = Transaction;
  const proposalId = proposalClaimedFormatter(transaction);
  return Votes.update({
    claimed: true,
    claimedTx: TransactionId,
    claimedTime: time
  }, {
    where: {
      proposalId,
      voter: From
    }
  });
}

module.exports = {
  // isProposalRelated,
  isProposalCreated,
  proposalCreatedInsert,
  // isProposalVoted,
  proposalVotedReducer,
  proposalVotedInsert,
  // isProposalReleased,
  proposalReleasedInsert,
  isProposalClaimed,
  proposalClaimedInsert
};
