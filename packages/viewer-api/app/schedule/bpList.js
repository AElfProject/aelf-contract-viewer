const { Subscription } = require('egg');
const elliptic = require('elliptic');
const AElf = require('aelf-sdk');
const { getContract } = require('../utils');


const defaultEncryptAlgorithm = 'secp256k1';
const defaultEc = elliptic.ec(defaultEncryptAlgorithm);

class BPList extends Subscription {
  static get schedule() {
    return {
      cron: '0 0 */12 * * *',
      type: 'all',
      immediate: true
    };
  }

  async subscribe() {
    const { app } = this;
    let list;
    try {
      const contract = await getContract(app.config.constants.endpoint, 'AElf.ContractNames.Consensus');
      list = await contract.GetCurrentMinerList.call();
      list = list.pubkeys;
    } catch (e) {
      list = [];
    }
    list = list.map(pub => {
      let pubKey = Buffer.from(pub, 'base64');
      const keyPair = defaultEc.keyFromPublic(pubKey);
      pubKey = keyPair.getPublic();
      return AElf.wallet.getAddressFromPubKey(pubKey);
    });
    app.logger.info('bp list', list);
    app.cache.BPList = list;
  }
}

module.exports = BPList;
