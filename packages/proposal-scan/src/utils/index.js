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
  return dataType.toObject(dataType.decode(Buffer.from(input, 'base64')), {
    enums: String, // enums as string names
    longs: String, // longs as strings (requires long.js)
    bytes: String, // bytes as base64 encoded strings
    defaults: false, // includes default values
    arrays: true, // populates empty arrays (repeated fields) even if defaults=false
    objects: true, // populates empty objects (map fields) even if defaults=false
    oneofs: true // includes virtual oneof fields set to the present field's name
  });
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

function formatTimestamp(timestamp) {
  let time = moment(timestamp);
  if (time.isValid()) {
    return time;
  }
  const {
    seconds,
    nanos = 0
  } = timestamp;
  time = seconds * 1000 + (nanos || 0) / 1000;
  return moment(time);
}

function asyncFilter(array, predicate, ...args) {
  return Promise.all(array.map(v => predicate(v, ...args)))
    .then(results => array.filter((_, i) => results[i]));
}

module.exports = {
  deserializeLogs,
  sleep,
  parseParams,
  formatTimestamp,
  asyncFilter,
  deserializeContract
};
