/**
 * @file utils
 * @author atom-yang
 */
const AElf = require('aelf-sdk');
const config = require('../config');

const contractMethods = [
  'DeploySmartContract',
  'DeploySystemSmartContract',
  'UpdateSmartContract',
  'ChangeContractAuthor',
  'ChangeGenesisOwner'
];

// eslint-disable-next-line no-unused-vars
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
      console.error(e);
      paramsJson = Params;
    }
    const {
      toAddress,
      contractMethodName
    } = paramsJson;
    return toAddress === config.contracts.zero.address && contractMethods.includes(contractMethodName);
  }
  return false;
}

const eventNames = [
  'ContractDeployed',
  'CodeUpdated',
  'AuthorChanged'
];

function isContractDeployedOrUpdated(transaction) {
  const {
    Logs,
    Status
  } = transaction;
  if (Status.toUpperCase() === 'MINED' && Logs && Logs.length > 0) {
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

function deserializeLog(log) {
  const {
    NonIndexed,
    Indexed = [],
    Name
  } = log;
  const dataType = config.contracts.zero.proto.lookupType(Name);
  let result = dataType.decode(Buffer.from(`${Array.isArray(Indexed) ? Indexed.join('') : ''}${NonIndexed}`, 'base64'));
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
  result.eventName = Name;
  return result;
}

async function getCorrespondResult(deserializeResult) {
  const {
    address,
    eventName
  } = deserializeResult;
  const result = await Promise.all([
    config.contracts.zero.contract.GetContractInfo.call(address),
    config.contracts.zero.contract.GetSmartContractRegistrationByAddress.call(address)
  ]).then(contract => ({
    ...contract[0],
    ...contract[1],
    address,
    eventName
  }));
  switch (eventName) {
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
      throw new Error(`Unknown event name ${eventName}`);
  }
  return result;
}

function contractTransactionFormatted(transaction) {
  const {
    Logs,
    TransactionId,
    BlockNumber
  } = transaction;
  const contractDeployed = Logs.filter(v => {
    const {
      Address,
      Name
    } = v;
    return Address === config.contracts.zero.address && eventNames.includes(Name);
  }).map(deserializeLog);
  return Promise.all(contractDeployed.map(v => getCorrespondResult(v)))
    .then(res => res.map(merged => ({
      ...merged,
      blockHeight: BlockNumber,
      txId: TransactionId
    })));
}

module.exports = {
  isContractDeployedOrUpdated,
  contractTransactionFormatted
};
