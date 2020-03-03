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
      proto,
      type: config.constants.proposalTypes[key.toUpperCase()]
    };
    if (key === 'parliament') {
      contractAddress[key].defaultOrganizationAddress = contract.GetDefaultOrganizationAddress.call({ sync: true });
    }
  });
  const deployController = genContract.GetContractDeploymentController.call({
    sync: true
  });
  const codeController = genContract.GetCodeCheckController.call({
    sync: true
  });
  const sideChainController = contractAddress.crossChain.contract.GetSideChainLifetimeController.call({
    sync: true
  });
  const feeController = contractAddress.token.contract.GetMethodFeeController.call({
    sync: true
  });
  const userFeeController = contractAddress.token.contract.GetUserFeeController.call({
    sync: true
  });
  return {
    aelf,
    wallet,
    chainInitTime: Time,
    contracts: contractAddress,
    controller: {
      ProposeNewContract: deployController,
      ProposeUpdateContract: deployController,
      ProposeContractCodeCheck: codeController,
      RequestSideChainCreation: sideChainController,
      MethodFee: feeController,
      ParliamentUserFee: {
        contractAddress: contractAddress.parliament.address,
        ownerAddress: userFeeController.parliamentController
      },
      AssociationUserFee: {
        contractAddress: contractAddress.association.address,
        ownerAddress: userFeeController.rootController
      },
      ReferendumUserFee: {
        contractAddress: contractAddress.referendum.address,
        ownerAddress: userFeeController.referendumController
      }
    }
  };
}

config = {
  ...config,
  ...getContractAddress(config.contracts)
};

config.constants.addressProposalTypesMap = Object.values(config.contracts).reduce((acc, v) => {
  const {
    address,
    type
  } = v;
  return !type ? acc : {
    ...acc,
    [address]: type
  };
}, {});

config.scannerName = 'proposal-scan';

module.exports = config;
