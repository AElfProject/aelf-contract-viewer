/**
 * @file index
 * @author atom-yang
 */
const {
  ScanCursor
} = require('viewer-orm/model/scanCursor');
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
    console.error(`root catch ${err.toString()}`);
    cleanup();
  }
}

init();
