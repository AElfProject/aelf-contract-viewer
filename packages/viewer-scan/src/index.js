/**
 * @file index
 * @author atom-yang
 */
const AElf = require('aelf-sdk');
const {
  Blocks
} = require('viewer-orm/model/blocks');
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
  const lastId = await Blocks.getLastIncId();
  if (lastId === 0) {
    await Blocks.insertIncId(0);
  }
  const scanner = new Scanner({
    ...config.scan,
    aelf: new AElf(new AElf.providers.HttpProvider(config.scan.host))
  });
  const decompiler = new Decompiler(config.decompiler);
  try {
    await scanner.init();
    console.log('start loop');
    setTimeout(() => {
      console.log('start decompiler DLL');
      decompiler.init().catch(console.error);
    }, 120000);
  } catch (err) {
    console.error(`root catch ${err.toString()}`);
    cleanup();
  }
}

init();
