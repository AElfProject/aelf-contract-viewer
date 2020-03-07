/**
 * @file index
 * @author atom-yang
 */
const AElf = require('aelf-sdk');
const {
  ScanCursor
} = require('viewer-orm/model/scanCursor');
const {
  Scanner
} = require('aelf-block-scan');
const config = require('./config');
const DBScanner = require('./dbScanner');
const DBOperation = require('./dbOperation');
const {
  listeners
} = require('./config/constants');

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
  const lastId = await ScanCursor.getLastId(config.scannerName);
  if (lastId === false) {
    await ScanCursor.insertIncId(0, config.scannerName);
  }
  const lastDBId = await ScanCursor.getLastId(config.dbScannerName);
  if (lastDBId === false) {
    await ScanCursor.insertIncId(0, config.dbScannerName);
  }
  const aelf = new AElf(new AElf.providers.HttpProvider(config.scan.host));
  const scanner = new Scanner(new DBOperation({}), {
    ...config.scan,
    aelfInstance: aelf,
    interval: config.scan.proposalInterval,
    startHeight: lastId + 1,
    missingHeightList: [],
    listeners,
    scanMode: 'listener'
  });
  const dbScanner = new DBScanner({
    aelf,
    concurrentQueryLimit: config.scan.concurrentQueryLimit,
    interval: config.scan.proposalInterval
  });
  try {
    await scanner.start();
    console.log('start loop');
    await dbScanner.init();
  } catch (err) {
    console.error(`root catch ${err.toString()}`);
    cleanup();
  }
}

init();
