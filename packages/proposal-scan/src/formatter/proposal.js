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

const crossChainRelatedMethods = [
  'RequestSideChainCreation',
  'ReleaseSideChainCreation'
];

const systemProposalMethods = [
  ...contractRelatedMethods,
  ...crossChainRelatedMethods
];

const proposalCreatedMethods = [
  'CreateProposal',
  'RequestSideChainCreation',
  'ReleaseApprovedContract',
  'ProposeContractCodeCheck',
  'ProposeNewContract',
  'ProposeUpdateContract'
];

const proposalVotedMethods = [
  'Approve',
  'Reject',
  'Abstain',
  'ApproveMultiProposals',
];

const proposalReleaseMethods = [
  'Release',
  'ReleaseApprovedContract',
  'ReleaseCodeCheckedContract',
  'ReleaseSideChainCreation'
];

// methods would be called after releasing
const proposalPostReleaseMethods = [
  'ReclaimVoteToken',
  // 'ClearProposal'
];

function isProposalRelated(methodName) {
  return [
    ...proposalCreatedMethods,
    ...proposalVotedMethods,
    ...proposalReleaseMethods,
    ...proposalPostReleaseMethods
  ].includes(methodName);
}

function isProposalCreated(transaction) {
  const {
    Logs = []
  } = transaction;
  return (Logs || []).filter(({ Name }) => Name === 'ProposalCreated').length > 0;
}

const SYSTEM_PROPOSAL_EXPIRATION_TIME = 60 * 60 * 24; // seconds
const SYSTEM_PROPOSAL_METHODS_MAP = {
  // ProposeContractCodeCheck: ['DeploySmartContract', 'UpdateSmartContract'],
  ProposeNewContract: 'ProposeContractCodeCheck',
  ProposeUpdateContract: 'ProposeContractCodeCheck',
  RequestSideChainCreation: 'CreateSideChain'
};

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
    const proposalType = config.constants.addressProposalTypesMap[contractAddress];
    // todo: proposal已经被释放的情况下，无法查询到提案的相关信息
    let result = {
      createTxId: TransactionId,
      createAt: time,
      proposalId,
      createdBy: systemProposalMethods.includes(MethodName) ? 'SYSTEM_CONTRACT' : 'USER',
      isContractDeployed: contractRelatedMethods.includes(MethodName),
      proposalType
    };
    let contractMethodName;
    let params;
    let proposalInfo = {
      toBeReleased: false,
      proposer: From
    };
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
          expiredTime: moment(time).add(SYSTEM_PROPOSAL_EXPIRATION_TIME, 'second')
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
          expiredTime: moment(time).add(SYSTEM_PROPOSAL_EXPIRATION_TIME, 'second')
        };
        break;
      default:
        // eslint-disable-next-line no-case-declarations,max-len
        const proposalInfoFromChain = await config.contracts[proposalType.toLowerCase()].contract.GetProposal.call(proposalId);
        if (!proposalInfoFromChain) {
          return {};
        }
        proposalInfo = {
          ...proposalInfo,
          ...proposalInfoFromChain,
          expiredTime: formatTimestamp(proposalInfoFromChain.expiredTime)
        };
    }
    const {
      contractMethodName: contractMethod,
      toAddress,
      params: contractParams,
      expiredTime,
      organizationAddress,
      proposer,
      toBeReleased
    } = proposalInfo;
    result = {
      ...result,
      orgAddress: organizationAddress,
      proposer,
      contractAddress: toAddress,
      contractMethod,
      contractParams,
      expiredTime: formatTimestamp(expiredTime).utcOffset(0).format(),
      status: toBeReleased ? proposalStatus.APPROVED : proposalStatus.PENDING
    };
    return result;
  }))
    .then(results => results.filter(v => Object.keys(v).length > 0));
}

async function proposalCreatedInsert(transaction) {
  const formattedData = await proposalCreatedFormatter(transaction);
  return ProposalList.bulkCreate(formattedData);
}

function isProposalVoted(transaction) {
  const {
    Transaction
  } = transaction;
  const {
    MethodName
  } = Transaction;
  return [
    'Abstain',
    'Approve',
    'Reject',
    'ApproveMultiProposals'
  ].includes(MethodName);
}

async function proposalVotedReducer(transactionList) {
  const proposalIdsMap = transactionList.reduce((acc, item, txIndex) => {
    const {
      Transaction,
    } = item;
    const {
      Params,
      MethodName
    } = Transaction;
    const parsedParams = parseParams(Params);
    let proposalIdArr = [parsedParams];
    if (MethodName === 'ApproveMultiProposals') {
      proposalIdArr = parsedParams.proposalIds;
    }
    const result = {
      ...acc
    };
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

async function proposalVotedFormatter(transaction) {
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
  let action = MethodName;
  let proposalIds = [];
  const parsedParams = parseParams(Params);
  if (MethodName === 'ApproveMultiProposals') {
    action = 'Approve';
    proposalIds = parsedParams.proposalIds;
  } else {
    proposalIds = [parsedParams];
  }
  const proposalType = addressProposalTypesMap[To];
  let logResults = [];
  if (proposalType === proposalTypes.REFERENDUM) {
    logResults = await deserializeLogs(Logs, 'Transferred');
    const decimals = await Promise.all(logResults.map(v => Tokens.getTokenDecimal(v.deserializeLogResult.symbol)));
    proposalIds = proposalIds.map((v, i) => {
      const decimal = decimals[i];
      const transferred = logResults[i].deserializeLogResult;
      const amount = new Decimal(transferred.amount).dividedBy(`1e${decimal}`).toString();
      return {
        ...transferred,
        proposalId: v,
        amount
      };
    });
  } else {
    proposalIds = proposalIds.map(v => ({ proposalId: v, amount: 1 }));
  }
  return Promise.all(proposalIds.map(async item => {
    const {
      proposalId,
      amount,
      symbol = 'none'
    } = item;
    const { contract } = config.contracts[proposalType.toLowerCase()];
    const proposalInfo = await contract.GetProposal.call(proposalId);
    const isExist = await ProposalList.isExist(proposalId);
    if (!isExist) {
      return false;
    }
    const result = {
      update: {
        proposalId,
        action: ACTION_COUNTS_MAP[action],
        amount,
        status: (proposalInfo && proposalInfo.toBeReleased)
          ? proposalStatus.APPROVED
          : proposalStatus.PENDING
      },
      vote: {
        txId: TransactionId,
        proposalId,
        voter: From,
        amount,
        symbol,
        action,
        proposalType,
        time
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
  return sequelize.transaction(t => Promise.all(formattedData.map(item => {
    const {
      update,
      vote
    } = item;
    const {
      proposalId,
      action,
      amount,
      status
    } = update;
    return Promise.all([
      Votes.create(vote, { transaction: t }),
      ProposalList.update({
        status,
        // watch out increment
        [action]: Sequelize.literal(`${action} + ${amount}`)
      }, {
        where: {
          proposalId
        },
        transaction: t
      })
    ]);
  })));
}

function isProposalReleased(transaction) {
  const {
    Logs = []
  } = transaction;
  return (Logs || []).filter(({ Name }) => Name === 'ProposalReleased').length > 0;
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
  } = transaction;
  const {
    To,
    MethodName
  } = Transaction;
  return To === config.contracts.referendum.address && MethodName === 'ReclaimVoteToken';
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
    time
  } = transaction;
  const proposalId = proposalClaimedFormatter(transaction);
  return Votes.update({
    claimed: true,
    claimedTx: TransactionId,
    claimedTime: time
  }, {
    where: {
      proposalId
    }
  });
}

module.exports = {
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
};
