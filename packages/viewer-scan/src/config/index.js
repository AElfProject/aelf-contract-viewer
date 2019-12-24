/**
 * @file config
 * @author atom-yang
 */
const AElf = require('aelf-sdk');
/* eslint-disable global-require */
let config;

if (process.env.NODE_ENV === 'production') {
  config = require('../../../../config.prod');
} else {
  config = require('../../../../config.dev');
}

function getContractAddress(contracts) {
  const contractAddress = {};
  const wallet = AElf.wallet.getWalletByPrivateKey(config.wallet.privateKey);
  const aelf = new AElf(new AElf.providers.HttpProvider(config.scan.host));
  const {
    GenesisContractAddress
  } = aelf.chain.getChainStatus({
    sync: true
  });
  const zeroProto = AElf.pbjs.Root.fromDescriptor(aelf.chain.getContractFileDescriptorSet(GenesisContractAddress, {
    sync: true
  }));
  const genContract = aelf.chain.contractAt(GenesisContractAddress, wallet, {
    sync: true
  });
  const {
    Time
  } = aelf.chain.getBlockByHeight(2, false, {
    sync: true
  }).Header;
  config.chainInitTime = Time;

  contractAddress.zero = {
    address: GenesisContractAddress,
    contract: genContract,
    proto: zeroProto
  };

  Object.entries(contracts).forEach(([key, value]) => {
    const address = genContract.GetContractAddressByName.call(AElf.utils.sha256(value), {
      sync: true
    });
    const proto = AElf.pbjs.Root.fromDescriptor(aelf.chain.getContractFileDescriptorSet(address, {
      sync: true
    }));
    const contract = aelf.chain.contractAt(address, wallet, {
      sync: true
    });
    contractAddress[key] = {
      address,
      contract,
      proto
    };
    if (key === 'parliament') {
      contractAddress[key].organizationAddress = contract.GetDefaultOrganizationAddress.call({ sync: true });
    }
    console.log(key, contractAddress[key].address);
  });
  return contractAddress;
}

config.contracts = {
  ...getContractAddress(config.contracts)
};

module.exports = config;
