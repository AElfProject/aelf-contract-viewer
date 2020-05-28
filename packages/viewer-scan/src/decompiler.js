/**
 * @file decompiler
 * @author atom-yang
 */
const axios = require('axios');
const {
  Scheduler
} = require('aelf-block-scan');
const {
  Files
} = require('viewer-orm/model/files');
const {
  Code
} = require('viewer-orm/model/code');

function timeout(time) {
  return new Promise(resolve => {
    setTimeout(resolve, time);
  });
}

class Decompiler {
  constructor(config) {
    this.options = config;
    this.scheduler = new Scheduler({
      interval: config.interval
    });
  }

  static async getLastId() {
    const latestCodeHash = await Files.getLatestCodeHash();
    if (!latestCodeHash) {
      return 0;
    }
    const id = await Code.getIdByCodeHash(latestCodeHash.codeHash);
    if (!id) {
      throw new Error(`no correspond code hash ${latestCodeHash}`);
    }
    return id.toJSON().id;
  }

  async getData(codeContent, queryTime = 1) {
    await timeout(10 * 1000);
    try {
      const result = await axios.post(this.options.remoteApi, {
        base64string: codeContent
      }, {
        timeout: 60 * 1000
      });
      const { data } = result;
      if (data && +data.code === 0) {
        return data.data;
      }
      throw data;
    } catch (e) {
      console.error('error occurred when querying files', e);
      const nextTime = queryTime + 1;
      if (nextTime > 3) {
        throw e;
      }
      return this.getData(codeContent, nextTime);
    }
  }

  async queryInBatch() {
    const lastId = await Decompiler.getLastId();
    const maxId = await Code.getMaxId();
    const ids = new Array(maxId - lastId).fill(1).map((v, i) => i + lastId);
    // eslint-disable-next-line no-restricted-syntax
    for (const id of ids) {
      // eslint-disable-next-line no-await-in-loop
      await this.callback(id);
    }
  }

  async callback(lastId) {
    const maxId = await Code.getMaxId();
    if (lastId >= maxId) {
      console.log(`has query for max id ${maxId}, skip this loop`);
      return;
    }
    console.log(`Query from Code table id ${lastId + 1}`);
    const {
      address,
      codeHash,
      code
    } = await Code.getCodeById(lastId + 1);
    try {
      const result = await this.getData(code);
      await Files.findOrCreate({
        where: {
          codeHash
        },
        defaults: {
          address,
          codeHash,
          files: JSON.stringify(result),
          status: true
        }
      });
    } catch (e) {
      console.error(e);
      await Files.findOrCreate({
        where: {
          codeHash
        },
        defaults: {
          address,
          codeHash,
          files: JSON.stringify(e),
          status: false
        }
      });
    }
  }

  async init() {
    await this.queryInBatch();
    const lastId = await Decompiler.getLastId();
    console.log(`start decompiling in loop from ${lastId + 1}`);
    this.scheduler.setCallback(async () => {
      await this.queryInBatch();
    });
    this.scheduler.startTimer();
  }
}

module.exports = Decompiler;
