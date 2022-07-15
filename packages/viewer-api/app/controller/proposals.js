/**
 * @file get proposal list
 * @author atom-yang
 */
const Controller = require('../core/baseController');
const {
  getTxResult,
  deserializeLog,
  getActualProposalStatus,
  getTxResultAddAelf,
} = require('../utils');

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
      values: Object.values(this.app.config.constants.proposalStatus),
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
      type: 'enum',
      values: [ '0', '1' ],
      default: '0',
      required: false
    }
  };

  appliedProposalListRules = {
    proposalType: {
      type: 'enum',
      values: Object.values(this.app.config.constants.proposalTypes),
      required: true
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
    address: {
      type: 'string',
      trim: true,
      required: true
    }
  };

  contractNameRules = {
    contractName: {
      type: 'string',
      trim: true,
      required: true,
      min: 1,
      max: 150
    },
    txId: {
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

  updateContractNameRules = {
    contractName: {
      type: 'string',
      trim: true,
      required: true,
      min: 1,
      max: 150
    },
    contractAddress: {
      type: 'string',
      trim: true,
      required: true,
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
      max: 150
    },
  };

  async getProposalById() {
    const { ctx, app } = this;
    const { config } = app;
    const { constants: { proposalTypes, proposalStatus } } = config;
    try {
      const { BPList = [], parliamentProposerList = [] } = app.cache;
      const errors = app.validator.validate(paramRules, ctx.request.query);
      if (errors) {
        throw errors;
      }
      const {
        address,
        proposalId
      } = ctx.request.query;
      let proposal = await app.model.ProposalList.getProposalById(proposalId);
      if (Object.keys(proposal).length === 0) {
        throw new Error('not exist');
      }
      const {
        orgAddress,
        proposalType
      } = proposal;
      const organization = await app.model.Organizations.getOrganizationByAddress(orgAddress);
      /* eslint-disable no-case-declarations */
      if (address) {
        switch (proposalType) {
          case proposalTypes.PARLIAMENT:
            // 议会形式
            const isBp = BPList.includes(address);
            if (isBp) {
              // 有权限进行投票
              const ParVotedIds = await app.model.Votes.hasVoted(
                address,
                proposalTypes.PARLIAMENT,
                [ proposalId ]
              );
              proposal = {
                ...proposal,
                canVote: true,
                votedStatus: ParVotedIds[proposalId] || 'none'
              };
            } else {
              // 无权限进行投票
              proposal = {
                ...proposal,
                canVote: false,
                votedStatus: 'none'
              };
            }
            break;
          case proposalTypes.REFERENDUM:
            // 公投模型，人人均有权限进行投票
            const referVotedIds = await app.model.Votes.hasVoted(
              address,
              proposalTypes.REFERENDUM,
              [ proposalId ]
            );
            proposal = {
              ...proposal,
              canVote: true,
              votedStatus: referVotedIds[proposalId] || 'none'
            };
            break;
          case proposalTypes.ASSOCIATION:
            // 组织模型，组织成员有权限进行投票
            const {
              leftOrgInfo
            } = organization;
            const {
              organizationMemberList = {}
            } = leftOrgInfo;
            const {
              organizationMembers
            } = organizationMemberList;
            const assoVotedIds = await app.model.Votes.hasVoted(
              address,
              proposalTypes.ASSOCIATION,
              [ proposalId ]
            );
            proposal = {
              ...proposal,
              canVote: Array.isArray(organizationMembers) ? organizationMembers.includes(address) : false,
              votedStatus: assoVotedIds[proposalId] || 'none'
            };
            break;
          default:
            throw new Error('not a valid proposal type');
        }
      } else {
        proposal = {
          ...proposal,
          canVote: false,
          votedStatus: 'none'
        };
      }
      this.sendBody({
        proposal: getActualProposalStatus(proposal, proposalStatus),
        bpList: BPList,
        organization,
        parliamentProposerList
      });
    } catch (e) {
      this.error(e);
      this.sendBody();
    }
  }

  async getList() {
    const { ctx, app } = this;
    const { config } = app;
    const { constants: { proposalTypes, proposalStatus } } = config;
    try {
      const errors = app.validator.validate(this.proposalListRules, ctx.request.query);
      if (errors) {
        throw errors;
      }
      const {
        address,
        search,
        isContract = '0',
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
        +isContract === 1,
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
      const { BPList = [] } = app.cache;
      /* eslint-disable no-case-declarations */
      if (address) {
        switch (proposalType) {
          case proposalTypes.PARLIAMENT:
            // 议会形式
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
                organizationMemberList = {}
              } = leftOrgInfo;
              const {
                organizationMembers = []
              } = organizationMemberList;
              return {
                ...acc,
                [orgAddress]: Array.isArray(organizationMembers) ? organizationMembers.includes(address) : false
              };
            }, {});
            const assoVotedIds = await app.model.Votes.hasVoted(
              address,
              proposalTypes.ASSOCIATION,
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
        list: list.map(v => getActualProposalStatus(v, proposalStatus)),
        bpCount: BPList.length,
        total
      });
    } catch (e) {
      console.error(e);
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
      let result = await app.model.ContractNames.isExist(contractName);
      if (!result) {
        result = await app.model.Contracts.isExistName(contractName);
      }
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
      const {
        isAudit
      } = ctx;
      if (!isAudit) {
        throw new Error('need log in and sign');
      }
      const {
        contractName,
        txId,
        action,
        address,
      } = ctx.request.body;
      let isExist = await app.model.ContractNames.isExist(contractName);
      if (!isExist) {
        isExist = await app.model.Contracts.isExistName(contractName);
      }
      if (isExist) {
        throw new Error('contract name has been taken');
      } else {
        this.sendBody({});
        getTxResult(txId).then(res => {
          if (res.Status === 'MINED') {
            const {
              Logs = []
            } = res;
            const log = (Logs || []).filter(v => v.Name === 'ProposalCreated');
            if (log.length === 0) {
              return;
            }
            const result = deserializeLog(log[0]);
            if (result.length === 1) {
              app.model.ContractNames.addName({
                contractName,
                txId,
                action,
                address,
                proposalId: result[0].proposalId
              });
            }
          }
        }).catch(err => {
          console.log(err);
        });
      }
    } catch (e) {
      this.error(e);
      this.sendBody();
    }
  }

  async updateContractName() {
    const { ctx, app } = this;
    try {
      const errors = app.validator.validate(this.updateContractNameRules, ctx.request.body);
      if (errors) {
        throw errors;
      }
      const { isAudit } = ctx;
      if (!isAudit) {
        throw new Error('need log in and sign');
      }
      const {
        contractName,
        address,
        contractAddress
      } = ctx.request.body;
      let isExist = await app.model.ContractNames.isExist(contractName);
      if (!isExist) {
        isExist = await app.model.Contracts.isExistName(contractName);
      }
      if (isExist) {
        throw new Error('contract name has been taken');
      } else {
        const info = await app.model.Code.getLastEventTxId({
          contractAddress,
          event: 'ContractDeployed'
        });
        const result = await getTxResultAddAelf(info.txId, app.config.constants.endpoint);
        if (result.Status === 'MINED') {
          const {
            Transaction = {}
          } = result;
          const admin = Transaction.From;
          if (admin !== address) throw new Error('Contract name update failed. Please confirm the contract name to be updated again！');
          const res = await app.model.Contracts.updateContractName({
            contractName,
            contractAddress,
            address,
          });
          this.sendBody(res);
        } else {
          throw new Error('Contract name update failed. Please confirm the contract name to be updated again！');
        }
      }
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

  async appliedProposal() {
    const { ctx, app } = this;
    const { config } = app;
    const { constants: { proposalStatus } } = config;
    try {
      const {
        address,
        search,
        pageSize = 20,
        pageNum = 1,
        proposalType
      } = ctx.request.query;
      const errors = app.validator.validate(this.appliedProposalListRules, ctx.request.query);
      if (errors) {
        throw errors;
      }
      let result = await app.model.ProposalList.getAppliedProposal(
        address,
        proposalType,
        +pageNum,
        +pageSize,
        search
      );
      result = {
        ...result,
        list: result.list.map(v => getActualProposalStatus(v, proposalStatus))
      };
      this.sendBody(result);
    } catch (e) {
      this.error(e);
      this.sendBody();
    }
  }
}

module.exports = ProposalsController;
