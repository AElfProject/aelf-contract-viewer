/**
 * @file get contract list
 * @author atom-yang
 */
const AElf = require('aelf-sdk');
const Controller = require('../core/baseController');

const getCodeRules = {
  address: {
    type: 'string',
    required: false
  },
  codeHash: {
    type: 'string',
    required: false
  }
};

class HistoryController extends Controller {
  async getFile() {
    const { ctx, app } = this;
    try {
      app.validator.validate(getCodeRules, ctx.request.query);
      const {
        address,
        codeHash
      } = ctx.request.query;
      let result;
      if (codeHash) {
        result = await app.model.Files.getFilesByCodeHash(codeHash);
        const contractInfo = await app.model.Contracts.getInfoByAddress(address);
        result = {
          ...contractInfo,
          ...result
        };
      } else if (address) {
        try {
          AElf.utils.base58.decode(address.trim());
          result = await app.model.Files.getFilesByAddress(address);
          const contractInfo = await app.model.Contracts.getInfoByAddress(address);
          result = {
            ...result,
            ...contractInfo
          };
        } catch (e) {
          throw new Error(e.message || 'The address you passed is not valid');
        }
      } else {
        throw new Error('You have to pass a valid code hash or contract address');
      }
      this.sendBody(result);
    } catch (e) {
      this.error(e);
      this.sendBody();
    }
  }
}

module.exports = HistoryController;
