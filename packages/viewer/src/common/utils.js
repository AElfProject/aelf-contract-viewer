/**
 * @file utils
 * @author atom-yang
 */
import AElf from 'aelf-sdk';
import debounce from 'lodash.debounce';
import { endsWith, startsWith } from 'lodash';
import config from './config';
import { request } from './request';

export async function innerHeight(minHeight = 400, time = 0, timeout = 500, maxTime = 10) {
  const currentTime = time + 1;
  if (currentTime > maxTime) {
    return '100vh';
  }
  try {
    const height = document.querySelector('#app').clientHeight;
    if (height && height > minHeight) {
      return `${height + 100}px`;
    }
    throw new Error('invalid');
  } catch (e) {
    await new Promise(resolve => {
      setTimeout(() => {
        resolve();
      }, timeout);
    });
    return innerHeight(minHeight, currentTime);
  }
}

export function sendMessage(message = {}, origin = '*') {
  if (window.parent) {
    window.parent.postMessage({
      type: 'viewer',
      message
    }, origin);
  }
}

export const sendHeight = debounce(minHeight => {
  innerHeight(minHeight).then(height => {
    sendMessage({ height });
  }).catch(err => {
    console.error(err);
  });
}, 100);

const regWeburl = new RegExp(
  '^'
  // protocol identifier (optional)
  // short syntax // still required
  + '(?:(?:(?:https?|ftp):)?\\/\\/)'
  // user:pass BasicAuth (optional)
  + '(?:\\S+(?::\\S*)?@)?'
  + '(?:'
  // IP address exclusion
  // private & local networks
  + '(?!(?:10|127)(?:\\.\\d{1,3}){3})'
  + '(?!(?:169\\.254|192\\.168)(?:\\.\\d{1,3}){2})'
  + '(?!172\\.(?:1[6-9]|2\\d|3[0-1])(?:\\.\\d{1,3}){2})'
  // IP address dotted notation octets
  // excludes loopback network 0.0.0.0
  // excludes reserved space >= 224.0.0.0
  // excludes network & broadcast addresses
  // (first & last IP address of each class)
  + '(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])'
  + '(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}'
  + '(?:\\.(?:[1-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))'
  + '|'
  // host & domain names, may end with dot
  // can be replaced by a shortest alternative
  // (?![-_])(?:[-\\w\\u00a1-\\uffff]{0,63}[^-_]\\.)+
  + '(?:'
  + '(?:'
  + '[a-z0-9\\u00a1-\\uffff]'
  + '[a-z0-9\\u00a1-\\uffff_-]{0,62}'
  + ')?'
  + '[a-z0-9\\u00a1-\\uffff]\\.'
  + ')+'
  // TLD identifier name, may end with dot
  + '(?:[a-z\\u00a1-\\uffff]{2,}\\.?)'
  + ')'
  // port number (optional)
  + '(?::\\d{2,5})?'
  // resource path (optional)
  + '(?:[/?#]\\S*)?'
  + '$', 'i'
);

export const validateURL = url => regWeburl.test(url);

export const removePrefixOrSuffix = address => {
  let result = address;
  if (typeof result !== 'string' || !result) {
    return '';
  }
  if (startsWith(result, 'ELF_')) {
    [, result] = result.split('ELF_');
  }
  if (endsWith(result, `_${config.viewer.chainId}`)) {
    [result] = result.split(`_${config.viewer.chainId}`);
  }
  if (/_/.test(result)) {
    [result] = result.split('_').sort((a, b) => b.length || 0 - a.length || 0);
  }
  return result;
};

const fakeWallet = AElf.wallet.getWalletByPrivateKey(config.wallet.privateKey);

const DEFAUT_RPCSERVER = process.env.NODE_ENV === 'production'
  ? `${window.location.protocol}//${window.location.host}/chain`
  : `${window.location.protocol}//${window.location.host}`;

export async function getBalances(address, search = '') {
  try {
    const balances = await request(config.API_PATH.GET_BALANCES_BY_ADDRESS, {
      address,
      search
    }, {
      method: 'GET'
    });
    if (balances.length === 0) {
      throw new Error('Zero Balances');
    }
    return balances;
  } catch (e) {
    console.error(e);
    return [
      {
        balance: 0,
        symbol: 'ELF'
      }
    ];
  }
}

export async function getTokenAllInfo(symbol) {
  try {
    const info = await request(config.API_PATH.GET_TOKEN_INFO, {
      symbol
    }, {
      method: 'GET'
    });
    if (Object.keys(info).length === 0) {
      throw new Error(`not exist token ${symbol}`);
    }
    return info;
  } catch (e) {
    console.error(e);
    return {};
  }
}

export async function getTokenList(search = '') {
  let tokens;
  try {
    const { list = [] } = await request(config.API_PATH.GET_TOKEN_LIST, {
      search
    }, {
      method: 'GET'
    });
    if (list.length === 0) {
      throw new Error('Empty Tokens');
    }
    tokens = list;
  } catch (e) {
    tokens = [{
      symbol: 'ELF',
      decimals: 8,
      totalSupply: '1000000000'
    }];
  }
  return tokens.reduce((acc, v) => ({
    ...acc,
    [v.symbol]: v
  }), {});
}

let CONTRACT_NAMES = {};
export const getContractNames = async () => {
  if (Object.keys(CONTRACT_NAMES).length > 0) {
    return CONTRACT_NAMES;
  }
  let res = {};
  try {
    res = await request(config.API_PATH.GET_ALL_CONTRACT_NAME, {}, {
      method: 'GET'
    });
  } catch (e) {
    return CONTRACT_NAMES;
  }
  const {
    list
  } = res || {};
  CONTRACT_NAMES = (list || []).reduce((acc, v) => ({
    ...acc,
    [v.address]: v
  }), {});
  return CONTRACT_NAMES;
};

export function removeAElfPrefix(name) {
  if (/^(AElf\.)(.*?)+/.test(name)) {
    return name.split('.')[name.split('.').length - 1];
  }
  return name;
}

export const CONTRACT_INSTANCE_MAP = {};

export async function getContract(aelf, address) {
  if (!CONTRACT_INSTANCE_MAP[address]) {
    CONTRACT_INSTANCE_MAP[address] = await aelf.chain.contractAt(address, fakeWallet);
  }
  return CONTRACT_INSTANCE_MAP[address];
}

export async function getContractDividend(address) {
  try {
    const contract = await getContract(address);
    if (contract.GetProfitsAmount) {
      const result = await contract.GetProfitsAmount.call();
      return result || {};
    }
    return {};
  } catch (e) {
    console.error(e);
    return {};
  }
}

export async function getContractMethodList(aelf, address) {
  if (!CONTRACT_INSTANCE_MAP[address]) {
    CONTRACT_INSTANCE_MAP[address] = await aelf.chain.contractAt(address, fakeWallet);
  }
  const contract = CONTRACT_INSTANCE_MAP[address];
  return Object.keys(contract)
    .filter(v => /^[A-Z]/.test(v)).sort();
}

const contractsNamesMap = {};
const defaultAElfInstance = new AElf(new AElf.providers.HttpProvider(DEFAUT_RPCSERVER));

export async function getContractByName(name) {
  if (!contractsNamesMap[name]) {
    const {
      GenesisContractAddress
    } = await defaultAElfInstance.getChainStatus();
    const zeroContract = await getContract(GenesisContractAddress);
    contractsNamesMap[name] = await zeroContract.GetContractAddressByName.call(AElf.utils.sha256(name));
  }
  return getContract(contractsNamesMap[name]);
}

export async function deserializeLog(log, name, address) {
  const {
    Indexed = [],
    NonIndexed
  } = log;
  let dataType;
  const contract = await getContract(defaultAElfInstance, address);
  // eslint-disable-next-line no-restricted-syntax
  for (const service of contract.services) {
    try {
      dataType = service.lookupType(name);
      break;
    } catch (e) {}
  }
  const serializedData = [...(Indexed || [])];
  if (NonIndexed) {
    serializedData.push(NonIndexed);
  }
  let result = serializedData.reduce((acc, v) => {
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
  result = AElf.utils.transform.transform(dataType, result, AElf.utils.transform.OUTPUT_TRANSFORMERS);
  result = AElf.utils.transform.transformArrayToMap(dataType, result);
  return result;
}
