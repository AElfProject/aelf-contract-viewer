/**
 * @file get contract list
 * @author atom-yang
 */
const moment = require('moment');
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

class ListController extends Controller {
  async getList() {
    const { ctx, app } = this;
    try {
      app.validator.validate(getListRules, ctx.request.query);
      const {
        address = '',
        pageSize = 10,
        pageNum
      } = ctx.request.query;
      const {
        list,
        total
      } = await app.model.Contracts.getList({
        pageSize,
        pageNum,
        address
      });
      this.sendBody({
        list: list.map(v => ({
          ...v,
          updateTime: moment(v.updateTime).utcOffset(0).format('YYYY/MM/DD HH:mm:ssZ')
        })),
        total
      });
    } catch (e) {
      this.error(e);
      this.sendBody();
    }
  }

  async getAllContracts() {
    const { ctx, app } = this;
    try {
      const {
        search = ''
      } = ctx.request.query;
      // todo: 空search的情况下，考虑从缓存获取数据
      const list = await app.model.Contracts.getAllList(search);
      this.sendBody({
        list: list.map(v => ({
          ...v,
          address: v.address,
          contractName: +v.contractName === -1 ? '' : v.contractName
        })),
        total: list.length
      });
    } catch (e) {
      this.error(e);
      this.sendBody();
    }
  }
}

module.exports = ListController;
