/* eslint-disable global-require */
let config = {};

if (process.env.NODE_ENV === 'production') {
  config = require('./config.prod');
} else {
  config = require('./config.dev');
}

module.exports = {
  wallet: {
    privateKey: 'f6e512a3c259e5f9af981d7f99d245aa5bc52fe448495e0b0dd56e8406be6f71'
  },
  contracts: {
    parliament: 'AElf.ContractNames.Parliament',
    referendum: 'AElf.ContractNames.Referendum',
    association: 'AElf.ContractNames.Association',
    crossChain: 'AElf.ContractNames.CrossChain'
  },
  contractNames: [
    'AElf.ContractNames.Election',
    'AElf.ContractNames.Profit',
    'AElf.ContractNames.Vote',
    'AElf.ContractNames.Treasury',
    'AElf.ContractNames.Token',
    'AElf.ContractNames.TokenHolder',
    'AElf.ContractNames.TokenConverter',
    'AElf.ContractNames.Consensus',
    'AElf.ContractNames.Parliament',
    'AElf.ContractNames.CrossChain',
    'AElf.ContractNames.Association',
    'AElf.ContractNames.Configuration',
    'AElf.ContractNames.Referendum',
    'AElf.ContractNames.Economic'
  ],
  viewer: {
    viewerUrl: './viewer.html',
    addressUrl: '/address',
    txUrl: '/tx',
    blockUrl: '/block',
    chainId: 'AELF'
  },
  constants: {
    proposalTypes: {
      PARLIAMENT: 'Parliament',
      REFERENDUM: 'Referendum',
      ASSOCIATION: 'Association'
    },
    proposalStatus: {
      NOT_PASSED: 'not_passed',
      APPROVED: 'approved',
      MINED: 'mined'
    }
  },
  ...config
};
