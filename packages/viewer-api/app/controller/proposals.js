/**
 * @file get proposal list
 * @author atom-yang
 */
const Controller = require('../core/baseController');

const paramRules = {
  proposalId: {
    type: 'string',
    trim: true,
    required: true,
    max: 64,
    min: 64
  }
};

const tokenSearchRules = {
  search: {
    type: 'string',
    required: false,
    allowEmpty: true,
    trim: true
  }
};

class ProposalsController extends Controller {
  proposalListRules = {
    proposalType: {
      type: 'enum',
      values: Object.values(this.app.config.constants.proposalTypes),
      required: true
    },
    status: {
      type: 'enum',
      values: [ 'all', ...Object.values(this.app.config.constants.proposalStatus), 'expired' ],
      default: 'all',
      required: false,
    },
    search: {
      type: 'string',
      required: false,
      allowEmpty: true,
      trim: true
    },
    pageSize: {
      type: 'int',
      convertType: 'int',
      default: 6,
      min: 6,
      required: false
    },
    pageNum: {
      type: 'int',
      convertType: 'int',
      min: 1,
      required: false
    },
    isContract: {
      type: 'bool',
      default: false,
      required: false
    }
  };

  contractNameRules = {
    contractName: {
      type: 'string',
      trim: true,
      required: true,
      min: 1,
      max: 100
    },
    txId: {
      type: 'string',
      trim: true,
      required: true,
      min: 64,
      max: 64
    },
    proposalId: {
      type: 'string',
      trim: true,
      required: true,
      min: 64,
      max: 64
    },
    action: {
      type: 'enum',
      values: [ 'DEPLOY', 'UPDATE' ],
      required: true
    },
    address: {
      type: 'string',
      trim: true,
      required: true
    }
  };

  checkContractNameRules = {
    contractName: {
      type: 'string',
      trim: true,
      required: true,
      min: 1,
      max: 100
    },
  };

  async getParam() {
    const { ctx, app } = this;
    try {
      const errors = app.validator.validate(paramRules, ctx.request.query);
      if (errors) {
        throw errors;
      }
      const {
        proposalId
      } = ctx.request.query;
      const {
        contractParams = ''
      } = await app.model.ProposalList.getParams(proposalId);
      this.sendBody({
        params: contractParams
      });
    } catch (e) {
      this.error(e);
      this.sendBody();
    }
  }

  async getList() {
    const { ctx, app } = this;
    const { config } = app;
    const { constants: { proposalTypes } } = config;
    try {
      const errors = app.validator.validate(this.proposalListRules, ctx.request.query);
      if (errors) {
        throw errors;
      }
      const { isAudit } = ctx;
      const {
        address,
        search,
        isContract = false,
        pageSize = 6,
        pageNum = 1,
        status,
        proposalType
      } = ctx.request.query;
      let {
        list,
        total
      } = await app.model.ProposalList.getPureList(
        proposalType,
        status,
        pageNum,
        pageSize,
        isContract,
        search
      );
      if (total === 0 || list.length === 0) {
        this.sendBody({
          list,
          total
        });
        return;
      }
      let organizations = Object.keys(list.reduce((acc, v) => {
        return {
          ...acc,
          [v.orgAddress]: v.orgAddress
        };
      }, {}));
      organizations = await app.model.Organizations.getBatchOrganizations(organizations);
      organizations = organizations.reduce((acc, org) => {
        return {
          ...acc,
          [org.orgAddress]: org
        };
      }, {});
      /* eslint-disable no-case-declarations */
      if (isAudit) {
        switch (proposalType) {
          case proposalTypes.PARLIAMENT:
            // 议会形式
            const { BPList = [] } = app.cache;
            const isBp = BPList.includes(address);
            if (isBp) {
              // 有权限进行投票
              const ParVotedIds = await app.model.Votes.hasVoted(
                address,
                proposalTypes.PARLIAMENT,
                list.map(v => v.proposalId)
              );
              list = list.map(item => {
                return {
                  ...item,
                  organizationInfo: organizations[item.orgAddress],
                  canVote: true,
                  votedStatus: ParVotedIds[item.proposalId] || 'none'
                };
              });
            } else {
              // 无权限进行投票
              list = list.map(item => {
                return {
                  ...item,
                  organizationInfo: organizations[item.orgAddress],
                  canVote: false,
                  votedStatus: 'none'
                };
              });
            }
            break;
          case proposalTypes.REFERENDUM:
            // 公投模型，人人均有权限进行投票
            const referVotedIds = await app.model.Votes.hasVoted(
              address,
              proposalTypes.REFERENDUM,
              list.map(v => v.proposalId)
            );
            list = list.map(item => {
              return {
                ...item,
                organizationInfo: organizations[item.orgAddress],
                canVote: true,
                votedStatus: referVotedIds[item.proposalId] || 'none'
              };
            });
            break;
          case proposalTypes.ASSOCIATION:
            // 组织模型，组织成员有权限进行投票
            const auditOrgs = Object.values(organizations).reduce((acc, item) => {
              const {
                orgAddress,
                leftOrgInfo
              } = item;
              const {
                organizationMemberList = []
              } = leftOrgInfo;
              return {
                ...acc,
                [orgAddress]: Array.isArray(organizationMemberList) ? organizationMemberList.includes(address) : false
              };
            }, {});
            const assoVotedIds = await app.model.Votes.hasVoted(
              address,
              proposalTypes.REFERENDUM,
              list.map(v => v.proposalId)
            );
            list = list.map(item => {
              return {
                ...item,
                organizationInfo: organizations[item.orgAddress],
                canVote: auditOrgs[item.orgAddress],
                votedStatus: assoVotedIds[item.proposalId] || 'none'
              };
            });
            break;
          default:
            throw new Error('not a valid proposal type');
        }
      } else {
        list = list.map(item => {
          return {
            ...item,
            organizationInfo: organizations[item.orgAddress],
            canVote: false,
            votedStatus: 'none'
          };
        });
      }
      this.sendBody({
        isAudit,
        list,
        total
      });
    } catch (e) {
      this.error(e);
      this.sendBody();
    }
  }

  async checkContractName() {
    const { ctx, app } = this;
    try {
      const errors = app.validator.validate(this.checkContractNameRules, ctx.request.query);
      if (errors) {
        throw errors;
      }
      const {
        contractName,
      } = ctx.request.query;
      const result = await app.model.ContractNames.isExist(contractName);
      this.sendBody({
        isExist: result
      });
    } catch (e) {
      this.error(e);
      this.sendBody();
    }
  }

  async addContractName() {
    const { ctx, app } = this;
    try {
      const errors = app.validator.validate(this.contractNameRules, ctx.request.body);
      if (errors) {
        throw errors;
      }
      const result = await app.model.ContractNames.addName(ctx.request.body);
      if (result === false) {
        throw new Error('contract name has been taken');
      }
      this.sendBody({});
    } catch (e) {
      this.error(e);
      this.sendBody();
    }
  }

  async getTokenList() {
    const { ctx, app } = this;
    try {
      const errors = app.validator.validate(tokenSearchRules, ctx.request.query);
      if (errors) {
        throw errors;
      }
      const {
        search = ''
      } = ctx.request.query;
      const list = await app.model.Tokens.getTokenList(search);
      this.sendBody({
        list
      });
    } catch (e) {
      this.error(e);
      this.sendBody();
    }
  }
}

module.exports = ProposalsController;
