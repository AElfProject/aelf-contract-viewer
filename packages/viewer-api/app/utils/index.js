/**
 * @file utils
 * @author atom-yang
 */
const AElf = require('aelf-sdk');

let zero = null;
let wallet = null;
let aelf = null;
async function getContract(endpoint, name) {
  if (!wallet) {
    wallet = AElf.wallet.createNewWallet();
    aelf = new AElf(new AElf.providers.HttpProvider(endpoint));
    const status = await aelf.chain.getChainStatus();
    zero = status.GenesisContractAddress;
  }
  const zeroContract = await aelf.chain.contractAt(zero, wallet);
  const address = await zeroContract.GetContractAddressByName.call(AElf.utils.sha256(name));
  return aelf.chain.contractAt(address, wallet);
}

async function getTxResult(txId, times = 0, delay = 5000, timeLimit = 10) {
  const currentTime = times + 1;
  await new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, delay);
  });
  const tx = await aelf.chain.getTxResult(txId);
  if (tx.Status === 'PENDING' && currentTime <= timeLimit) {
    const result = await getTxResult(aelf, txId, currentTime, delay, timeLimit);
    return result;
  }
  if (tx.Status === 'PENDING' && currentTime > timeLimit) {
    return tx;
  }
  if (tx.Status === 'MINED') {
    return tx;
  }
  throw tx;
}

function parseJSON(str = '') {
  let result = null;
  try {
    result = JSON.parse(str);
  } catch (e) {
    result = str;
  }
  return result;
}

async function deserializeLog(log) {
  const {
    Address,
    Name
  } = log;
  const contract = await aelf.chain.contractAt(Address, wallet);
  return contract.deserializeLog([ log ], Name);
}


module.exports = {
  getContract,
  getTxResult,
  parseJSON,
  deserializeLog
};
