/**
 * @file config file
 * @author atom-yang
 */
const { constants, scan, redis } = require('../../../config');

module.exports = appInfo => {
  exports = {};
  const config = exports;

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + '_production';

  config.redis = {
    client: {
      port: redis.port, // Redis port
      host: redis.host, // Redis host
      db: redis.db,
      password: null
    }
  };

  // add your config here
  config.middleware = [];

  config.security = {
    csrf: {
      enable: process.env.NODE_ENV === 'production'
    }
  };
  config.validate = {
    convert: true
  };
  config.proxy = true;
  config.sentry = {
    dsn: 'https://e1d73b8ad26d4a6d94d4126eb37d86c1@o414245.ingest.sentry.io/5303398'
  };
  config.onerror = {
    all(err, ctx) {
      const { app } = ctx;
      const { Sentry } = app;
      Sentry.withScope(scope => {
        scope.addEventProcessor(event => Sentry.Handlers.parseRequest(event, ctx.request));
        Sentry.captureException(err);
      });
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
