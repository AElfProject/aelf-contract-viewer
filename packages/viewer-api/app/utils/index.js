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


module.exports = {
  getContract
};
