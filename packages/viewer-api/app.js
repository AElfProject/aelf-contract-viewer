/**
 * @file app
 * @author atom-yang
 */
const { Files } = require('viewer-orm/model/files');
const { Contracts } = require('viewer-orm/model/contracts');
const { Code } = require('viewer-orm/model/code');
const { Proposers } = require('viewer-orm/model/proposers');
const { Organizations } = require('viewer-orm/model/organizations');
const { ProposalList } = require('viewer-orm/model/proposalList');
const { Votes } = require('viewer-orm/model/votes');
const { ContractNames } = require('viewer-orm/model/contractNames');

// todo: 增加获取系统合约和初始化Contracts中contractNames字段的脚本

module.exports = app => {
  app.model = {
    Files,
    Contracts,
    Code,
    Proposers,
    Organizations,
    ProposalList,
    Votes,
    ContractNames
  };
};
