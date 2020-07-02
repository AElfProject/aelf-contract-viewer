/**
 * @file app
 * @author atom-yang
 */
const Sentry = require('@sentry/node');
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
const { Events } = require('viewer-orm/model/events');
const { TokenTx } = require('viewer-orm/model/tokenTx');

module.exports = app => {
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
    Events,
    TokenTx
  };
  if (process.env.NODE_ENV === 'production') {
    Sentry.init(app.config.sentry);
    app.Sentry = Sentry;
    app.on('error', (err, ctx) => {
      Sentry.withScope(scope => {
        scope.addEventProcessor(event => Sentry.Handlers.parseRequest(event, ctx.request));
        Sentry.captureException(err);
      });
    });
  }
};
