/**
 * @file utils
 * @author
 */
const AElf = require('aelf-sdk');
const moment = require('moment');
const config = require('../config');

const protos = Object.values(config.contracts).reduce((acc, i) => {
  const { address, proto } = i;
  return {
    ...acc,
    [address]: {
      proto,
      lastUpdatedAt: new Date().getTime()
    }
  };
}, {});

const updateInterval = 1000 * 60 * 60 * 12; // 12小时更新一次

async function getProto(address) {
  const nowTime = new Date().getTime();
  if (protos[address] && nowTime - protos[address].lastUpdatedAt > updateInterval) {
    return protos[address].proto;
  }
  const proto = AElf.pbjs.Root.fromDescriptor(await config.aelf.chain.getContractFileDescriptorSet(address));
  protos[address] = {
    proto,
    lastUpdatedAt: new Date().getTime()
  };
  return protos[address].proto;
}

async function deserializeContract(address, name, input) {
  const proto = await getProto(address);
  const dataType = proto.lookupType(name);
  let result = dataType.toObject(dataType.decode(Buffer.from(input, 'base64')), {
    enums: String, // enums as string names
    longs: String, // longs as strings (requires long.js)
    bytes: String, // bytes as base64 encoded strings
    defaults: false, // includes default values
    arrays: true, // populates empty arrays (repeated fields) even if defaults=false
    objects: true, // populates empty objects (map fields) even if defaults=false
    oneofs: true // includes virtual oneof fields set to the present field's name
  });
  result = AElf.utils.transform.transform(dataType, result, AElf.utils.transform.OUTPUT_TRANSFORMERS);
  result = AElf.utils.transform.transformArrayToMap(dataType, result);
  return result;
}

async function deserializeLogs(logs = [], logName) {
  if (!logs || logs.length === 0) {
    return null;
  }
  const filteredLogs = logs.filter(({ Name }) => logName === Name);
  let results = await Promise.all(filteredLogs.map(v => getProto(v.Address)));
  results = results.map((proto, index) => {
    const {
      Address,
      Name: dataTypeName,
      NonIndexed,
      Indexed = []
    } = filteredLogs[index];
    const dataType = proto.lookupType(dataTypeName);
    const serializedData = [...(Indexed || [])];
    if (NonIndexed) {
      serializedData.push(NonIndexed);
    }
    let deserializeLogResult = serializedData.reduce((acc, v) => {
      let deserialize = dataType.decode(Buffer.from(v, 'base64'));
      deserialize = dataType.toObject(deserialize, {
        enums: String, // enums as string names
        longs: String, // longs as strings (requires long.js)
        bytes: String, // bytes as base64 encoded strings
        defaults: false, // includes default values
        arrays: true, // populates empty arrays (repeated fields) even if defaults=false
        objects: true, // populates empty objects (map fields) even if defaults=false
        oneofs: true // includes virtual oneof fields set to the present field's name
      });
      return {
        ...acc,
        ...deserialize
      };
    }, {});
    // eslint-disable-next-line max-len
    deserializeLogResult = AElf.utils.transform.transform(dataType, deserializeLogResult, AElf.utils.transform.OUTPUT_TRANSFORMERS);
    deserializeLogResult = AElf.utils.transform.transformArrayToMap(dataType, deserializeLogResult);
    return {
      contractAddress: Address,
      deserializeLogResult,
      name: dataTypeName
    };
  });
  return results;
}

function sleep(timeout = 1000) {
  return new Promise(resolve => {
    setTimeout(() => resolve(), timeout);
  });
}

function parseParams(params) {
  try {
    return JSON.parse(params);
  } catch (e) {
    return params;
  }
}

function stringifyParams(params) {
  if (typeof params === 'string') {
    return params;
  }
  return JSON.stringify(params);
}

function formatTimestamp(timestamp) {
  if (typeof timestamp === 'string') {
    return moment(timestamp);
  }
  if (moment.isMoment(timestamp)) {
    return timestamp;
  }
  const {
    seconds,
    nanos = 0
  } = timestamp;
  const time = seconds * 1000 + (nanos || 0) / 1000000;
  return moment(time);
}

function asyncFilter(array, predicate, ...args) {
  return Promise.all(array.map(v => predicate(v, ...args)))
    .then(results => array.filter((_, i) => results[i]));
}

const CONTRACT_TEMP_LIST = {};
async function caAccountCallDataFilterFormatter({
  From, To, MethodName, Params
}) {
  const isCaCall = To === config.contracts['Portkey.Contracts.CA'].address && MethodName === 'ManagerForwardCall';
  if (isCaCall) {
    const paramsOfCaCall = parseParams(Params);
    const {
      caHash, methodName, args, contractAddress
    } = paramsOfCaCall;
    const holderInfo = await config.contracts['Portkey.Contracts.CA'].contract.GetHolderInfo.call({
      caHash
    });
    if (!CONTRACT_TEMP_LIST[contractAddress]) {
      CONTRACT_TEMP_LIST[contractAddress] = await config.aelf.chain.contractAt(contractAddress, config.wallet);
      console.log('create a new contract:', contractAddress);
    }
    // eg: const contractInstance = config.contracts.zero.contract
    // const params = await contractInstance[methodName].unpackPackedInput(Buffer.from(args, 'base64'));
    const params = await CONTRACT_TEMP_LIST[contractAddress][methodName].unpackPackedInput(Buffer.from(args, 'base64'));
    return {
      From: holderInfo.caAddress,
      To: contractAddress,
      MethodName: methodName,
      Params: stringifyParams(params)
    };
  }
  return {
    From,
    To,
    MethodName,
    Params
  };
}

module.exports = {
  deserializeLogs,
  sleep,
  parseParams,
  stringifyParams,
  formatTimestamp,
  asyncFilter,
  deserializeContract,
  caAccountCallDataFilterFormatter
};
