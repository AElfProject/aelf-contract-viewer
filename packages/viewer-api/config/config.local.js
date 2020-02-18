/**
 * @file config file
 * @author atom-yang
 */
const { constants, scan } = require('../../../config');

module.exports = appInfo => {
  exports = {};
  const config = exports;

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + '_development';

  // add your config here
  config.middleware = [];

  config.security = {
    csrf: {
      enable: process.env.NODE_ENV === 'production'
    }
  };
  return {
    ...config,
    constants: {
      ...constants,
      endpoint: scan.host
    }
  };
};
