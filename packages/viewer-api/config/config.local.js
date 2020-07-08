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

  config.validate = {
    convert: true
  };

  // config.swagger = {
  //   enable: true,
  //   mountPath: '/swagger', // swagger-ui  address  <domain>/test-mount
  //   swaggerFilePath: '/test-swagger.json', // swagger file default path
  //   enableGoogleFont: false,
  // };

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

  config.sentry = {
    dsn: ''
  };

  return {
    ...config,
    constants: {
      ...constants,
      endpoint: scan.host
    }
  };
};
