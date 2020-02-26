const { Subscription } = require('egg');
const { getContract } = require('../utils');

class BPList extends Subscription {
  static get schedule() {
    return {
      cron: '0 0 */6 * * *',
      type: 'all',
      immediate: true
    };
  }

  async subscribe() {
    const { app } = this;
    let list;
    try {
      const contract = await getContract(app.config.constants.endpoint, 'AElf.ContractNames.Parliament');
      const result = await contract.GetProposerWhiteListContext.call();
      list = result ? result.proposers : [];
    } catch (e) {
      list = [];
    }
    app.logger.info('parliament proposer list', list);
    app.cache.parliamentProposerList = list;
  }
}

module.exports = BPList;
