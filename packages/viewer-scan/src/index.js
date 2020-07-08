/**
 * @file index
 * @author atom-yang
 */
const {
  ScanCursor
} = require('viewer-orm/model/scanCursor');
const Sentry = require('@sentry/node');
const config = require('./config');
const Scanner = require('./scan');
const Decompiler = require('./decompiler');

function cleanup() {
  console.log('cleanup');
  process.exit(1);
}

process.on('unhandledRejection', err => {
  console.log('unhandledRejection');
  console.error(err);
  cleanup();
});

async function init() {
  if (process.env.NODE_ENV === 'production') {
    Sentry.init({
      dsn: 'https://a47fb98a510b486a885185ef87a9810f@o414245.ingest.sentry.io/5318679',
      release: `viewer-scan@${process.env.npm_package_version}`
    });
    Sentry.configureScope(scope => {
      scope.setTag('chainId', config.chainId);
      scope.setExtra('chainId', config.chainId);
    });
  }
  // const lastId = await Blocks.getLastIncId();
  const lastId = await ScanCursor.getLastId(config.scannerName);
  if (lastId === false) {
    await ScanCursor.insertIncId(0, config.scannerName);
  }
  const scanner = new Scanner({
    ...config.scan,
    aelf: config.aelf
  });
  const decompiler = new Decompiler(config.decompiler);
  try {
    await scanner.init();
    console.log('start loop');
    setTimeout(() => {
      console.log('start decompiler DLL');
      decompiler.init().catch(console.error);
    }, config.scan.interval + 10 * 60 * 1000);
  } catch (err) {
    Sentry.withScope(scope => {
      scope.addEventProcessor(event => event);
      Sentry.captureException(err);
    });
    console.error(`root catch ${err.toString()}`);
    cleanup();
  }
}

init();
