/**
 * @file utils
 * @author atom-yang
 */
const AElf = require('aelf-sdk');
const {
  Proposal
} = require('viewer-orm/model/proposal');
const config = require('../config');

const contractMethods = [
  'DeploySmartContract',
  'DeploySystemSmartContract',
  'UpdateSmartContract',
  'ChangeContractAuthor',
  'ChangeGenesisOwner'
];

const proposalMethods = [
  'Release'
];

const eventNames = [
  'ContractDeployed',
  'CodeUpdated',
  'AuthorChanged'
];

function removeFailedOrOtherMethod(transaction) {
  const {
    txStatus,
    method,
  } = transaction;
  return txStatus
    && txStatus.toUpperCase() === 'MINED'
    && (contractMethods.includes(method) || [...proposalMethods, 'CreateProposal'].includes(method));
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
  if (Status.toUpperCase() !== 'MINED') {
    return false;
  }
  if (
    To === config.contracts.zero.address
    && contractMethods.includes(MethodName)
  ) {
    return true;
  }
  return To === config.contracts.parliament.address
    && MethodName.toUpperCase() === 'RELEASE';
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
  if (Status.toUpperCase() === 'MINED'
    && To === config.contracts.parliament.address
    && MethodName === 'CreateProposal') {
    let paramsJson;
    try {
      paramsJson = JSON.parse(Params);
    } catch (e) {
      paramsJson = Params;
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

function proposalCreatedFormatter(transaction) {
  const {
    Logs,
    Transaction,
    BlockNumber,
    TransactionId
  } = transaction;
  const {
    Params,
    From
  } = Transaction;
  let paramsParsed;
  try {
    paramsParsed = JSON.parse(Params);
  } catch (e) {
    paramsParsed = Params;
  }
  const {
    contractMethodName,
    toAddress,
    params,
    expiredTime,
    organizationAddress
  } = paramsParsed;
  const {
    code
  } = deserialize(config.contracts.zero.contract[contractMethodName].inputType, params);
  const {
    proposalId
  } = deserializeLog(Logs[0]);
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
    organizationAddress
  };
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
        && eventNames.includes(Name);
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
      && eventNames.includes(Name);
  })[0];
  const deserializeResult = deserializeLog(log);
  const result = {
    address: deserializeResult.address
  };
  switch (log.Name) {
    case 'ContractDeployed':
      result.codeHash = deserializeResult.codeHash;
      result.author = deserializeResult.creator;
      break;
    case 'CodeUpdated':
      result.codeHash = deserializeResult.newCodeHash;
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
    To === config.contracts.parliament.address
    && proposalMethods.includes(MethodName)
  ) {
    // 通过提案进行的合约部署或者更新
    const {
      code
    } = await Proposal.getCode(params);
    await Proposal.update({
      released: true,
      releasedTxId: TransactionId,
      releasedBlockHeight: BlockNumber,
      releasedTime: contractTime
    }, {
      where: {
        proposalId: params
      }
    });
    // const tmp = await config.contracts.parliament.contract.GetProposal.call(params);
    // const {
    //   contractMethodName,
    //   params: proposalParams
    // } = tmp;
    // const dataType = config.contracts.zero.proto.lookupType(contractMethodName);
    // const {
    //   code,
    //   category
    // } = deserialize(dataType, proposalParams);
    result = {
      ...result,
      code
    };
  } else {
    // 零合约进行的合约部署/更新/作者更新
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
  contractTransactionFormatted,
  isContractRelated,
  isZeroContractOrProposalReleased,
  proposalCreatedFormatter,
  removeFailedOrOtherMethod
};
