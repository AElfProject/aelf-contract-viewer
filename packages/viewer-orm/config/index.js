/**
 * @file export config
 * @author atom-yang
 */
/* eslint-disable global-require */
let config;

if (process.env.NODE_ENV === 'production') {
  config = require('../../../config.prod');
} else {
  config = require('../../../config.dev');
}

config = {
  sql: {
    ...config.sql,
    username: config.sql.user,
    dialect: 'mysql',
    define: {
      timestamp: false
    }
  },
  scanSql: {
    ...config.scanSql,
    username: config.scanSql.user,
    dialect: 'mysql',
    define: {
      timestamp: false
    }
  }
};

module.exports = config;
/* eslint-enable global-require */
