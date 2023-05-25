/**
 * @file utils
 * @author atom-yang
 */
const AElf = require('aelf-sdk');
const moment = require('moment');
const {
  Proposal
} = require('viewer-orm/model/proposal');
const {
  ContractNames
} = require('viewer-orm/model/contractNames');
const config = require('../config');

const zeroContractRelatedMethods = [
  'DeploySmartContract',
  'DeploySystemSmartContract',
  'UpdateSmartContract',
  'ChangeContractAuthor',
  'ChangeGenesisOwner'
];

const zeroProposalCreatedMethods = [
  'ReleaseApprovedContract',
  'DeployUserSmartContract',
  'UpdateUserSmartContract',
];

const proposalCreatedMethods = [
  'CreateProposal'
];

const zeroReleasedMethods = [
  'ReleaseCodeCheckedContract',
  'ReleaseApprovedUserSmartContract',
];

const proposalReleasedMethods = [
  'Release'
];

const caAccountMayCallProposal = [
  'ManagerForwardCall'
];

const relatedMethods = [
  ...zeroContractRelatedMethods,
  ...proposalCreatedMethods,
  ...zeroReleasedMethods,
  ...proposalReleasedMethods,
  ...zeroProposalCreatedMethods,
  ...caAccountMayCallProposal,
];

const contractRelatedEventNames = [
  'ContractDeployed',
  'CodeUpdated',
  'AuthorChanged'
];

const proposalCreatedEventName = 'ProposalCreated';

const codeCheckCreatedEventName = 'CodeCheckRequired';

function removeFailedOrOtherMethod(transaction) {
  const {
    txStatus,
    method,
  } = transaction;
  return txStatus
    && txStatus.toUpperCase() === 'MINED'
    && relatedMethods.includes(method);
}

function isZeroContractOrProposalReleased(transaction) {
  const {
    Transaction,
    Status
  } = transaction;
  const {
    To,
    MethodName
  } = Transaction;
  return Status.toUpperCase() === 'MINED'
    // eslint-disable-next-line max-len
    && (To === config.contracts.zero.address && [...zeroContractRelatedMethods, ...zeroReleasedMethods].includes(MethodName))
    || (To === config.controller.contractAddress && proposalReleasedMethods.includes(MethodName));
}

function isProposalCreated(methodName, to, params) {
  if (to === config.controller.contractAddress
    && proposalCreatedMethods.includes(methodName)) {
    let paramsJson;
    try {
      paramsJson = JSON.parse(params);
    } catch (e) {
      paramsJson = params;
    }
    const {
      toAddress,
      contractMethodName
    } = paramsJson;
    return toAddress === config.contracts.zero.address
      && [
        'DeploySmartContract',
        'DeploySystemSmartContract',
        'UpdateSmartContract'
      ].includes(contractMethodName);
  }
  return false;
}

function isZeroProposalCreated(methodName, to) {
  return to === config.contracts.zero.address
  && zeroProposalCreatedMethods.includes(methodName);
}

function isProposalCreatedByCAAccount(methodName, to, params) {
  console.log('isProposalCreatedByCAAccount----------', methodName, to);
  if (to === config.contracts['Portkey.Contracts.CA'].address
    && methodName === 'ManagerForwardCall') {
    let paramsJson;
    try {
      paramsJson = JSON.parse(params);
    } catch (e) {
      paramsJson = params;
    }
    // {
    //   "caHash": "f78e0f6e5619863fe9bafc50be3641072be27cf449760d2f63aaa180a723bc9b",
    //   "contractAddress": "2UKQnHcQvhBT6X6ULtfnuh3b9PVRvVMEroHHkcK4YfcoH1Z1x2",
    //   "methodName": "DeployUserSmartContract",
    //   "args": "xxx"
    // }
    const {
      contractAddress,
      methodName: method
    } = paramsJson;
    return isZeroProposalCreated(method, contractAddress);
  }
  return false;
}

function isContractProposalCreated(transaction) {
  const {
    Transaction,
    Status
  } = transaction;
  const {
    To,
    MethodName,
    Params
  } = Transaction;
  return Status.toUpperCase() === 'MINED'
    && (isProposalCreated(MethodName, To, Params)
      || isZeroProposalCreated(MethodName, To)
      || isProposalCreatedByCAAccount(MethodName, To, Params));
}

function deserialize(dataType, serialized) {
  let result = dataType.decode(Buffer.from(serialized, 'base64'));
  result = dataType.toObject(result, {
    enums: String, // enums as string names
    longs: String, // longs as strings (requires long.js)
    bytes: String, // bytes as base64 encoded strings
    defaults: true, // includes default values
    arrays: true, // populates empty arrays (repeated fields) even if defaults=false
    objects: true, // populates empty objects (map fields) even if defaults=false
    oneofs: true // includes virtual oneof fields set to the present field's name
  });
  Object.entries(dataType.fields).forEach(([fieldName, field]) => {
    const fieldValue = result[fieldName];
    if (fieldValue === null || fieldValue === undefined) {
      return;
    }
    if (field.type === '.aelf.Address' && typeof fieldValue !== 'string') {
      result[fieldName] = Array.isArray(fieldValue)
        ? fieldValue.map(AElf.pbUtils.getRepForAddress) : AElf.pbUtils.getRepForAddress(fieldValue);
    }
    if (field.type === '.aelf.Hash' && typeof fieldValue !== 'string') {
      result[fieldName] = Array.isArray(fieldValue)
        ? fieldValue.map(AElf.pbUtils.getRepForHash) : AElf.pbUtils.getRepForHash(fieldValue);
    }
  });
  return result;
}

function deserializeLog(log) {
  const {
    NonIndexed,
    Address,
    Indexed = [],
    Name
  } = log;
  const { proto } = Object.values(config.contracts).filter(v => v.address === Address)[0];
  const dataType = proto.lookupType(Name);
  const result = deserialize(dataType, `${Array.isArray(Indexed) ? Indexed.join('') : ''}${NonIndexed}`);
  result.eventName = Name;
  return result;
}

async function proposalCreatedFormatter(transaction) {
  const {
    Logs = [],
    Transaction,
    BlockNumber,
    TransactionId,
    time
  } = transaction;
  const {
    Params,
    From,
    MethodName,
    To
  } = Transaction;
  let paramsParsed;
  try {
    paramsParsed = JSON.parse(Params);
  } catch (e) {
    paramsParsed = Params;
  }
  const {
    proposalId
  } = deserializeLog(Logs.filter(v => v.Name === proposalCreatedEventName)[0]);
  if (isProposalCreated(MethodName, To, paramsParsed)) {
    const {
      contractMethodName,
      toAddress,
      params,
      expiredTime,
      organizationAddress
    } = paramsParsed;
    let code = `[deserialize ERROR] params: ${JSON.stringify(params)}`;
    try {
      code = deserialize(config.contracts.zero.contract[contractMethodName].inputType, params).code;
    } catch (error) {
      console.log('deserialize error', error, params, transaction);
    }
    return {
      contractAddress: toAddress,
      contractMethod: contractMethodName,
      proposalId,
      proposer: From,
      code,
      released: false,
      createdTxId: TransactionId,
      createdBlockHeight: BlockNumber,
      expiredTime,
      organizationAddress,
      createdTime: time
    };
  }
  const {
    code
  } = deserializeLog(Logs.filter(v => v.Name === codeCheckCreatedEventName)[0]);
  const { organizationAddress } = config.controller;
  const expiredTime = moment(time)
    .add(10, 'm')
    .utcOffset(0)
    .format();
  const result = {
    contractAddress: To,
    contractMethod: MethodName,
    proposalId,
    proposer: From,
    code,
    released: false,
    createdTxId: TransactionId,
    createdBlockHeight: BlockNumber,
    expiredTime,
    organizationAddress,
    createdTime: time
  };
  if ((MethodName === 'ReleaseApprovedContract' || MethodName === 'ReleaseApprovedUserSmartContract')
    && To === config.contracts.zero.address) {
    const preProposalId = paramsParsed.proposalId || '';
    const contractName = await ContractNames.getContractName(preProposalId);
    if (contractName) {
      result.contractName = contractName;
    }
  }
  return result;
}

function isContractRelated(transaction) {
  const {
    Logs,
    Status
  } = transaction;
  if (Status && Status.toUpperCase() === 'MINED' && Logs && Logs.length > 0) {
    const result = Logs.filter(v => {
      const {
        Address,
        Name
      } = v;
      return Address === config.contracts.zero.address
        && contractRelatedEventNames.includes(Name);
    });
    return result.length > 0;
  }
  return false;
}

async function getContractLogResult(Logs) {
  const log = Logs.filter(v => {
    const {
      Address,
      Name
    } = v;
    return Address === config.contracts.zero.address
      && contractRelatedEventNames.includes(Name);
  })[0];
  const deserializeResult = deserializeLog(log);
  const result = {
    address: deserializeResult.address
  };
  switch (log.Name) {
    case 'ContractDeployed':
      result.codeHash = deserializeResult.codeHash;
      result.author = deserializeResult.author;
      result.version = deserializeResult.contractVersion || deserializeResult.version;
      break;
    case 'CodeUpdated':
      result.codeHash = deserializeResult.newCodeHash;
      result.version = deserializeResult.contractVersion || deserializeResult.version;
      break;
    case 'AuthorChanged':
      result.author = deserializeResult.newAuthor;
      break;
    default:
      throw new Error(`Unknown event name ${log.Name}`);
  }
  const {
    address,
    eventName
  } = deserializeResult;
  const contractInfo = await Promise.all([
    config.contracts.zero.contract.GetContractInfo.call(address),
    config.contracts.zero.contract.GetSmartContractRegistrationByAddress.call(address)
  ]).then(contract => ({
    ...contract[0],
    ...contract[1],
    address,
    eventName
  }));
  return {
    ...contractInfo,
    ...result
  };
}

async function contractTransactionFormatted(transaction) {
  const {
    Logs,
    TransactionId,
    BlockNumber,
    time,
    Transaction
  } = transaction;
  const {
    To,
    MethodName,
    Params
  } = Transaction;
  let params;
  try {
    params = JSON.parse(Params);
  } catch (e) {
    params = Params;
  }
  let contractTime = time;
  contractTime = contractTime.startsWith('1970') ? config.chainInitTime : contractTime;
  const contractInfo = await getContractLogResult(Logs);
  let result = {
    time: contractTime,
    blockHeight: BlockNumber,
    txId: TransactionId,
    ...contractInfo
  };
  if (
    (To === config.controller.contractAddress && proposalReleasedMethods.includes(MethodName))
    || (To === config.contracts.zero.address && zeroReleasedMethods.includes(MethodName))
  ) {
    const proposalId = params.proposalId || params;
    // 通过提案进行的合约部署或者更新
    const {
      code,
      contractName
    } = await Proposal.findOne({
      attributes: ['code', 'contractName'],
      where: {
        proposalId
      }
    });

    const contractNameFromContractNames = await ContractNames.getContractName(proposalId);
    const contractNameOutput = contractNameFromContractNames && (`${contractName}` === '-1')
      ? contractNameFromContractNames : contractName;

    await Proposal.update({
      released: true,
      releasedTxId: TransactionId,
      releasedBlockHeight: BlockNumber,
      releasedTime: contractTime
    }, {
      where: {
        proposalId
      }
    });
    result = {
      ...result,
      code,
      contractName: contractNameOutput
    };
  } else {
    // 零合约直接进行的合约部署/更新/作者更新，例如区块1的系统合约部署
    const {
      code
    } = params;
    result = {
      ...result,
      code
    };
  }
  return result;
}

module.exports = {
  isContractProposalCreated,
  isProposalCreatedByCAAccount,
  contractTransactionFormatted,
  isContractRelated,
  isZeroContractOrProposalReleased,
  proposalCreatedFormatter,
  removeFailedOrOtherMethod
};
