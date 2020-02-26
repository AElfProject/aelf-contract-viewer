/**
 * @file common
 * @author atom-yang
 */
const Sequelize = require('sequelize');
const config = require('../config');
const {
  authenticate
} = require('./utils');

const { scanSql } = config;

const scanSequelize = new Sequelize(scanSql.database, scanSql.username, scanSql.password, scanSql);
authenticate(scanSequelize).catch(e => {
  console.error(e);
  process.exit(1);
});

const scanModelOptions = {
  timestamps: false,
  initialAutoIncrement: 1,
  sequelize: scanSequelize
};

module.exports = {
  scanModelOptions,
  scanSequelize
};
