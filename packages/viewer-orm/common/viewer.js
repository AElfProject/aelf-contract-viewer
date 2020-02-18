/**
 * @file common
 * @author atom-yang
 */
const Sequelize = require('sequelize');
const config = require('../config');
const { authenticate } = require('./utils');

const { sql } = config;

const sequelize = new Sequelize(sql.database, sql.username, sql.password, sql);
authenticate(sequelize).catch(e => {
  console.error(e);
  process.exit(1);
});

const commonModelOptions = {
  timestamps: false,
  initialAutoIncrement: 1,
  sequelize
};

module.exports = {
  commonModelOptions,
  sequelize
};
