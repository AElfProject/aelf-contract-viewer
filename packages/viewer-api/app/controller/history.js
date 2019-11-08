/**
 * @file get contract list
 * @author atom-yang
 */
const AElf = require('aelf-sdk');
const Controller = require('../core/baseController');

const getListRules = {
  address: {
    type: 'string',
    required: true
  }
};

class HistoryController extends Controller {
  async getHistory() {
    const { ctx, app } = this;
    try {
      app.validator.validate(getListRules, ctx.request.query);
      const {
        address
      } = ctx.request.query;
      try {
        AElf.utils.base58.decode(address);
        const result = await app.model.Code.getHistory(address);
        this.sendBody(result);
      } catch (e) {
        throw new Error('The address you passed is not valid');
      }
    } catch (e) {
      this.error(e);
      this.sendBody();
    }
  }
}

module.exports = HistoryController;
