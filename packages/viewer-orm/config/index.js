/**
 * @file export config
 * @author atom-yang
 */
/* eslint-disable global-require */
let config;

if (process.env.NODE_ENV === 'production') {
  config = require('../../../config.prod').sql;
} else {
  config = require('../../../config.dev').sql;
}

config = {
  ...config,
  username: config.user,
  dialect: 'mysql',
  define: {
    timestamp: false
  }
};

module.exports = config;
/* eslint-enable global-require */
