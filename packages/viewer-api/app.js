/**
 * @file app
 * @author atom-yang
 */
const { Blocks } = require('viewer-orm/model/blocks');
const { Files } = require('viewer-orm/model/files');
const { Contracts } = require('viewer-orm/model/contracts');
const { Code } = require('viewer-orm/model/code');

module.exports = app => {
  app.model = {
    Blocks,
    Files,
    Contracts,
    Code
  };
};
