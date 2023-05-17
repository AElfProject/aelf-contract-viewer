/**
 * @file get contract list
 * @author atom-yang
 */
const Controller = require('../core/baseController');

const getListRules = {
  address: {
    type: 'string',
    required: false
  },
  pageSize: {
    type: 'int',
    convertType: 'int',
    required: false,
    default: 10
  },
  pageNum: {
    type: 'int',
    convertType: 'int',
    required: true,
    min: 1
  }
};

class TransferController extends Controller {
  async getList() {
    const { ctx, app } = this;
    try {
      const errors = app.validator.validate(getListRules, ctx.request.query);
      if (errors) {
        throw errors;
      }
      const {
        address = '',
        pageSize = 10,
        pageNum,
        isNft = false,
      } = ctx.request.query;
      const {
        list,
        total
      } = await (isNft ? app.model.NftTransfer : app.model.Transfer).getTransferByAddress(address, +pageNum, +pageSize);
      this.sendBody({
        list,
        total
      });
    } catch (e) {
      this.error(e);
      this.sendBody();
    }
  }

}

module.exports = TransferController;
