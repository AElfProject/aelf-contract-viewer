/**
 * @file index
 * @author atom-yang
 */
const {
  ScanCursor
} = require('viewer-orm/model/scanCursor');
const config = require('./config');
const Scanner = require('./scan');

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
  const scanner = new Scanner({
    ...config.scan,
    aelf: config.aelf
  });
  try {
    await scanner.init();
  } catch (err) {
    console.error(`root catch ${err.toString()}`);
    cleanup();
  }
}

init();
