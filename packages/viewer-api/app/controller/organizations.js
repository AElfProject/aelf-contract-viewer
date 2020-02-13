/**
 * @file get organization list
 * @author atom-yang
 */
const Controller = require('../core/baseController');

class OrganizationsController extends Controller {
  organizationsRules = {
    proposalType: {
      type: 'enum',
      values: Object.keys(this.app.config.constants.proposalTypes),
      required: true
    },
    search: {
      type: 'string',
      required: false,
      allowEmpty: true,
      trim: true
    },
    pageSize: {
      type: 'number',
      convertType: true,
      default: 6,
      min: 6,
      required: false
    },
    pageNum: {
      type: 'number',
      convertType: true,
      min: 1,
      required: false
    }
  };

  auditListRules = {
    proposalType: {
      type: 'enum',
      values: Object.keys(this.app.config.constants.proposalTypes),
      required: true
    },
    search: {
      type: 'string',
      required: false,
      allowEmpty: true,
      trim: true
    },
    address: {
      type: 'string',
      allowEmpty: true,
      required: true
    }
  };

  async getAuditList() {
    const { ctx, app } = this;
    const { config } = app;
    try {
      app.validator.validate(this.auditListRules, ctx.request.query);
      const {
        address,
        search,
        proposalType
      } = ctx.request.query;
      let list;
      // 根据用户地址查询有权限使用的组织全列表
      if (proposalType === config.constants.proposalTypes.PARLIAMENT) {
        const { BPList } = app.cache;
        const isBp = BPList.include(address);
        // 如果为BP节点，则所有的Parliament组织均可创建提案
        const organizationList = await app.model.Organizations.getAuditOrganizations(proposalType, search);
        list = organizationList.filter(item => {
          const {
            leftOrgInfo
          } = item;
          const { proposerAuthorityRequired } = leftOrgInfo;
          return isBp || !proposerAuthorityRequired;
        }).map(v => v.orgAddress);
      } else {
        list = await app.model.Proposers.getOrganizations(proposalType, address);
      }
      this.sendBody(list);
    } catch (e) {
      this.error(e);
      this.sendBody();
    }
  }

  async getList() {
    const { ctx, app } = this;
    try {
      app.validator.validate(this.organizationsRules, ctx.request.query);
      const {
        pageSize = 6,
        pageNum,
        search,
        proposalType
      } = ctx.request.query;
      const {
        list,
        total
      } = await app.model.Organizations.getOrganizations(
        proposalType,
        pageNum,
        pageSize,
        search
      );
      // todo: 时间+时区格式化
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

module.exports = OrganizationsController;
