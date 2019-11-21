/**
 * @file common
 * @author atom-yang
 */
const Sequelize = require('sequelize');
const config = require('../config');

const AUTH_RETRIES = Symbol('authenticateRetries');

function sleep(timeout = 1000) {
  return new Promise(resolve => {
    setTimeout(() => resolve(), timeout);
  });
}

async function authenticate(database) {
  // eslint-disable-next-line no-param-reassign
  database[AUTH_RETRIES] = database[AUTH_RETRIES] || 0;

  try {
    await database.authenticate();
  } catch (e) {
    if (e.name !== 'SequelizeConnectionRefusedError') throw e;
    if (database[AUTH_RETRIES] >= 3) throw e;

    // sleep 2s to retry, max 3 times
    // eslint-disable-next-line no-param-reassign
    database[AUTH_RETRIES] += 1;
    await sleep(2000);
    await authenticate(database);
  }
}

const { sql, scanSql } = config;

const sequelize = new Sequelize(sql.database, sql.username, sql.password, sql);
const scanSequelize = new Sequelize(scanSql.database, scanSql.username, scanSql.password, scanSql);
authenticate(sequelize).catch(e => {
  console.error(e);
  process.exit(1);
});
authenticate(scanSequelize).catch(e => {
  console.error(e);
  process.exit(1);
});

const commonModelOptions = {
  timestamps: false,
  initialAutoIncrement: 1,
  sequelize
};

const scanModelOptions = {
  timestamps: false,
  initialAutoIncrement: 1,
  sequelize: scanSequelize
};

module.exports = {
  commonModelOptions,
  scanModelOptions,
  sequelize,
  scanSequelize
};
