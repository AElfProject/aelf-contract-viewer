/**
 * @file index
 * @author atom-yang
 */
const {
  Scanner
} = require('aelf-block-scan');
const AElf = require('aelf-sdk');
const {
  Blocks
} = require('viewer-orm/model/blocks');
const config = require('./config');
const DBOperation = require('./dbOperation');
const Decompiler = require('./decompiler');

function cleanup() {
  console.log('cleanup');
  process.exit(1);
}

process.on('unhandledRejection', () => {
  console.log('unhandledRejection');
  cleanup();
});

async function init() {
  const lastHeight = await Blocks.getLastHeight();
  const scanner = new Scanner(new DBOperation({}), {
    ...config.scan,
    startHeight: lastHeight + 1,
    missingHeightList: [],
    aelfInstance: new AElf(new AElf.providers.HttpProvider(config.scan.host))
  });
  const decompiler = new Decompiler(config.decompiler);
  try {
    await scanner.start();
    console.log('start loop');
    setTimeout(() => {
      console.log('start decompiler DLL');
      decompiler.init().catch(console.error);
    }, 60000);
  } catch (err) {
    console.error(`root catch ${err.toString()}`);
    cleanup();
  }
}

init();
