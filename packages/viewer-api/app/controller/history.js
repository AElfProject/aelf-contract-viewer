/**
 * @file get contract list
 * @author atom-yang
 */
const AElf = require('aelf-sdk');
const moment = require('moment');
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
      const errors = app.validator.validate(getListRules, ctx.request.query);
      if (errors) {
        throw errors;
      }
      const {
        address
      } = ctx.request.query;
      try {
        AElf.utils.base58.decode(address);
        let result = await app.model.Code.getHistory(address);
        if (!result) {
          result = [];
        }
        this.sendBody(result.map(v => {
          const tmp = v.toJSON();
          return {
            ...tmp,
            updateTime: moment(tmp.updateTime).utcOffset(0).format('YYYY/MM/DD HH:mm:ssZ')
          };
        }));
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
