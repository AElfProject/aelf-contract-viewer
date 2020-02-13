/**
 * @file index
 * @author atom-yang
 */
const AElf = require('aelf-sdk');
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
  if (lastId === 0) {
    await ScanCursor.insertIncId(0, config.scannerName);
  }
  const scanner = new Scanner({
    ...config.scan,
    aelf: new AElf(new AElf.providers.HttpProvider(config.scan.host))
  });
  try {
    await scanner.init();
  } catch (err) {
    console.error(`root catch ${err.toString()}`);
    cleanup();
  }
}

init();
