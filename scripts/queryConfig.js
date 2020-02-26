/* eslint-disable global-require */
const path = require('path');
const fs = require('fs');
const AElf = require('aelf-sdk');
const config = require('../config');

const { host } = config.scan;

const contractNames = [
  {
    name: 'Token',
    description: 'contract Token',
    contractName: 'AElf.ContractNames.Token'
  },
  {
    name: 'Parliament',
    description: 'contract Parliament',
    contractName: 'AElf.ContractNames.Parliament'
  },
  {
    name: 'Association',
    description: 'contract Association',
    contractName: 'AElf.ContractNames.Association'
  },
  {
    name: 'Referendum',
    description: 'contract Referendum',
    contractName: 'AElf.ContractNames.Referendum'
  },
  {
    name: 'CrossChain',
    description: 'contract CrossChain',
    contractName: 'AElf.ContractNames.CrossChain'
  }
];

async function getContractAddress() {
  const aelf = new AElf(new AElf.providers.HttpProvider(host));
  const wallet = AElf.wallet.createNewWallet();
  const {
    ChainId,
    GenesisContractAddress
  } = await aelf.chain.getChainStatus();
  let result = {
    chainId: ChainId
  };
  const zeroContract = await aelf.chain.contractAt(GenesisContractAddress, wallet);
  const list = await Promise.all(contractNames.map(async item => {
    const { contractName, name, ...left } = item;
    const address = await zeroContract.GetContractAddressByName.call(AElf.utils.sha256(contractName));
    return {
      ...left,
      contractAddress: address,
      contractName: name
    };
  })).then(results => results.filter(item => item.contractAddress));
  result = {
    ...result,
    contractAddress: [
      {
        contractName: 'Genesis',
        description: 'contract Genesis',
        contractAddress: GenesisContractAddress
      },
      ...list
    ]
  };
  const originResult = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../config.json')).toString());
  result = {
    ...originResult,
    viewer: {
      ...originResult.viewer,
      ...result
    }
  };
  fs.writeFileSync(path.resolve(__dirname, '../config.json'), `${JSON.stringify(result, null, 2)}\n`);
}

getContractAddress().catch(console.error);
