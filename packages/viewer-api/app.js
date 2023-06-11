/**
 * @file app
 * @author atom-yang
 */
const Sentry = require('@sentry/node');
const AElf = require('aelf-sdk');
const { Files } = require('viewer-orm/model/files');
const { Contracts } = require('viewer-orm/model/contracts');
const { Code } = require('viewer-orm/model/code');
const { Tokens } = require('viewer-orm/model/tokens');
const { Proposers } = require('viewer-orm/model/proposers');
const { Organizations } = require('viewer-orm/model/organizations');
const { ProposalList } = require('viewer-orm/model/proposalList');
const { Members } = require('viewer-orm/model/members');
const { Votes } = require('viewer-orm/model/votes');
const { ContractNames } = require('viewer-orm/model/contractNames');
const { Balance } = require('viewer-orm/model/balance');
const { Transfer } = require('viewer-orm/model/transfer');
const { NftTransfer } = require('viewer-orm/model/nftTransfer');
const { Events } = require('viewer-orm/model/events');
const { TokenTx } = require('viewer-orm/model/tokenTx');
const { Transactions } = require('viewer-orm/model/transactions');
const { UnconfirmedTransactions } = require('viewer-orm/model/unconfirmedTransactions');

module.exports = async app => {
  app.cache = {};
  app.model = {
    Files,
    Contracts,
    Code,
    Proposers,
    Organizations,
    ProposalList,
    Votes,
    ContractNames,
    Tokens,
    Members,
    Balance,
    Transfer,
    NftTransfer,
    Events,
    TokenTx,
    Transactions,
    UnconfirmedTransactions
  };
  if (process.env.NODE_ENV === 'production') {
    const aelf = new AElf(new AElf.providers.HttpProvider(app.config.constants.endpoint));
    const {
      ChainId
    } = await aelf.chain.getChainStatus();
    Sentry.init({
      ...app.config.sentry,
      release: `viewer-api@${process.env.npm_package_version}`
    });
    Sentry.configureScope(scope => {
      scope.setTag('chainId', ChainId);
      scope.setExtra('chainId', ChainId);
    });
    app.Sentry = Sentry;
    app.on('error', (err, ctx) => {
      Sentry.withScope(scope => {
        scope.addEventProcessor(event => Sentry.Handlers.parseRequest(event, ctx.request));
        Sentry.captureException(err);
      });
    });
  }
};
