/**
 * @file config
 * @author atom-yang
 */
const AElf = require('aelf-sdk');
let config = require('../../../../config');

function getContractAddress(contracts) {
  const contractAddress = {};
  const wallet = AElf.wallet.getWalletByPrivateKey(config.wallet.privateKey);
  const aelf = new AElf(new AElf.providers.HttpProvider(config.scan.host));
  const {
    GenesisContractAddress,
    ChainId
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
  const systemAddressNameMap = config.contractNames.reduce((acc, name) => {
    const address = genContract.GetContractAddressByName.call(AElf.utils.sha256(name), {
      sync: true
    });
    if (address) {
      return {
        ...acc,
        [address]: name
      };
    }
    return acc;
  }, {});
  systemAddressNameMap[GenesisContractAddress] = 'Genesis';
  const codeController = genContract.GetCodeCheckController.call({
    sync: true
  });
  return {
    aelf,
    wallet,
    chainId: ChainId,
    chainInitTime: Time,
    contracts: contractAddress,
    systemAddressNameMap,
    controller: {
      organizationAddress: codeController.ownerAddress,
      contractAddress: codeController.contractAddress
    }
  };
}

config = {
  ...config,
  ...getContractAddress(config.contracts)
};

config.scannerName = 'viewer-scan';

module.exports = config;
