/**
 * @file app
 * @author atom-yang
 */
const { Files } = require('viewer-orm/model/files');
const { Contracts } = require('viewer-orm/model/contracts');
const { Code } = require('viewer-orm/model/code');
const { Tokens } = require('viewer-orm/model/tokens');
const { Proposers } = require('viewer-orm/model/proposers');
const { Organizations } = require('viewer-orm/model/organizations');
const { ProposalList } = require('viewer-orm/model/proposalList');
const { Votes } = require('viewer-orm/model/votes');
const { ContractNames } = require('viewer-orm/model/contractNames');

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
    Tokens
  };
};
