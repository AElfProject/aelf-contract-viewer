/**
 * @file proposal list model
 * @author atom-yang
 */
const moment = require('moment');
const Decimal = require('decimal.js');
const Sequelize = require('sequelize');
const {
  formatTimeWithZone
} = require('../common/utils');
const { commonModelOptions } = require('../common/viewer');
const config = require('../config');

const {
  Model,
  BIGINT,
  STRING,
  ENUM,
  DATE,
  NOW,
  TEXT,
  Op,
  BOOLEAN,
  DECIMAL
} = Sequelize;

const {
  constants: {
    proposalStatus,
    proposalTypes
  }
} = config;

const proposalListDescription = {
  id: {
    type: BIGINT,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
    field: 'id'
  },
  orgAddress: {
    type: STRING(255),
    allowNull: false,
    field: 'org_address'
  },
  createTxId: {
    type: STRING(255),
    allowNull: false,
    field: 'create_tx_id',
    comment: 'tx id of creating proposal'
  },
  createAt: {
    type: DATE,
    allowNull: false,
    defaultValue: NOW,
    field: 'created_at',
    comment: 'proposal created time',
    get() {
      const time = this.getDataValue('createAt');
      try {
        return formatTimeWithZone(time);
      } catch (e) {
        return time;
      }
    }
  },
  proposalId: {
    type: STRING(255),
    allowNull: false,
    field: 'proposal_id'
  },
  proposer: {
    type: STRING(255),
    allowNull: false
  },
  contractAddress: {
    type: STRING(255),
    allowNull: false,
    field: 'contract_address'
  },
  contractMethod: {
    type: STRING(255),
    allowNull: false,
    field: 'contract_method'
  },
  contractParams: {
    type: TEXT('long'),
    allowNull: true,
    field: 'contract_params'
  },
  expiredTime: {
    type: DATE,
    allowNull: false,
    defaultValue: NOW,
    field: 'expired_time',
    get() {
      const time = this.getDataValue('expiredTime');
      try {
        return formatTimeWithZone(time);
      } catch (e) {
        return time;
      }
    }
  },
  // 除以token的decimals
  approvals: {
    type: DECIMAL(64, 8),
    allowNull: false,
    defaultValue: 0,
    get() {
      const count = this.getDataValue('approvals');
      try {
        return new Decimal(count).toNumber();
      } catch (e) {
        return count;
      }
    }
  },
  rejections: {
    type: DECIMAL(64, 8),
    allowNull: false,
    defaultValue: 0,
    get() {
      const count = this.getDataValue('rejections');
      try {
        return new Decimal(count).toNumber();
      } catch (e) {
        return count;
      }
    }
  },
  abstentions: {
    type: DECIMAL(64, 8),
    allowNull: false,
    defaultValue: 0,
    get() {
      const count = this.getDataValue('abstentions');
      try {
        return new Decimal(count).toNumber();
      } catch (e) {
        return count;
      }
    }
  },
  leftInfo: {
    type: TEXT('long'),
    allowNull: true,
    field: 'left_info',
    get() {
      let data;
      try {
        data = this.getDataValue('leftInfo');
        return JSON.parse(data);
      } catch (e) {
        return data || {};
      }
    },
    set(value) {
      this.setDataValue('leftInfo', JSON.stringify(value));
    }
  },
  status: {
    // 无执行失败的情况，因为无法判断是否是失败
    type: ENUM(
      proposalStatus.PENDING,
      proposalStatus.APPROVED,
      proposalStatus.RELEASED
    ),
    allowNull: false,
    comment: 'proposal status'
  },
  releasedTxId: {
    type: STRING(255),
    allowNull: false,
    defaultValue: 'none',
    field: 'released_tx_id',
    comment: 'correspond released proposal transaction id'
  },
  releasedTime: {
    type: DATE,
    allowNull: false,
    defaultValue: NOW,
    field: 'released_time',
    get() {
      const time = this.getDataValue('releasedTime');
      try {
        return formatTimeWithZone(time);
      } catch (e) {
        return time;
      }
    }
  },
  createdBy: {
    type: ENUM('USER', 'SYSTEM_CONTRACT'),
    allowNull: false,
    field: 'created_by',
    defaultValue: 'USER',
  },
  isContractDeployed: {
    type: BOOLEAN,
    allowNull: false,
    field: 'is_contract_deployed',
    defaultValue: false,
  },
  proposalType: {
    type: ENUM(
      proposalTypes.PARLIAMENT,
      proposalTypes.REFERENDUM,
      proposalTypes.ASSOCIATION
    ),
    allowNull: false,
    field: 'proposal_type',
    comment: 'audit model of proposal'
  },
};

class ProposalList extends Model {
  static async getProposal(proposalId) {
    const result = await ProposalList.findOne({
      attributes: {
        exclude: ['contractParams']
      },
      where: {
        proposalId
      }
    });
    if (result) {
      return result.toJSON();
    }
    return false;
  }

  static getExistProposalIds(proposalIds) {
    return ProposalList.findAll({
      attributes: ['proposalId'],
      where: {
        proposalId: {
          [Op.in]: proposalIds
        }
      }
    }).then(results => results.map(item => item.proposalId));
  }

  static async isExist(proposalId) {
    const result = await ProposalList.findAll({
      attributes: ['id'],
      where: {
        proposalId
      }
    });
    return result.length > 0;
  }

  static async getAllProposalInfo(proposalId, options = {}) {
    const result = await ProposalList.findOne({
      where: {
        proposalId
      },
      ...options
    });
    if (result) {
      return result.toJSON();
    }
    return false;
  }

  static async getParams(proposalId) {
    const result = await ProposalList.findOne({
      attributes: ['contractParams'],
      where: {
        proposalId
      }
    });
    if (result) {
      return result.toJSON();
    }
    return {};
  }

  static async getProposalById(proposalId) {
    const result = await ProposalList.findOne({
      where: {
        proposalId
      }
    });
    if (result) {
      return result.toJSON();
    }
    return {};
  }

  static async getPureList(
    proposalType,
    status,
    pageNum,
    pageSize,
    isContract = false,
    search = ''
  ) {
    let whereCondition = {
      proposalType
    };
    if (status !== 'all') {
      if (status === 'expired') {
        whereCondition = {
          ...whereCondition,
          expiredTime: {
            [Op.lt]: moment().utcOffset(0).format()
          },
          status: {
            [Op.in]: [proposalStatus.PENDING, proposalStatus.APPROVED]
          }
        };
      } else if (status === proposalStatus.PENDING
        || status === proposalStatus.APPROVED
      ) {
        whereCondition = {
          ...whereCondition,
          status,
          expiredTime: {
            [Op.gt]: moment().utcOffset(0).format()
          },
        };
      } else {
        whereCondition = {
          ...whereCondition,
          status
        };
      }
    }
    if (isContract) {
      whereCondition = {
        ...whereCondition,
        isContractDeployed: true
      };
    }
    if ((search || '').trim().length > 0) {
      whereCondition = {
        ...whereCondition,
        [Op.or]: [
          {
            orgAddress: {
              [Op.substring]: search
            }
          },
          {
            proposalId: {
              [Op.substring]: search
            }
          },
          {
            proposer: {
              [Op.substring]: search
            }
          },
          {
            contractAddress: {
              [Op.substring]: search
            }
          },
          {
            contractMethod: {
              [Op.substring]: search
            }
          }
        ]
      };
    }
    const result = await ProposalList.findAndCountAll({
      attributes: {
        exclude: ['contractParams']
      },
      where: whereCondition,
      order: [
        ['id', 'DESC']
      ],
      offset: (pageNum - 1) * pageSize,
      limit: +pageSize
    });
    const total = result.count;
    const list = result.rows.map(v => v.toJSON());
    return {
      total,
      list
    };
  }

  static async getAppliedProposal(
    address,
    proposalType,
    pageNum,
    pageSize,
    search = ''
  ) {
    let whereCondition = {
      proposalType,
      proposer: address
    };
    if ((search || '').trim().length > 0) {
      whereCondition = {
        ...whereCondition,
        proposalId: {
          [Op.substring]: search
        }
      };
    }
    const result = await ProposalList.findAndCountAll({
      attributes: ['proposalId', 'createAt', 'createTxId', 'status', 'expiredTime'],
      where: whereCondition,
      order: [
        ['id', 'DESC']
      ],
      offset: (pageNum - 1) * pageSize,
      limit: +pageSize
    });
    const total = result.count;
    const list = result.rows.map(v => v.toJSON());
    return {
      total,
      list
    };
  }
}

ProposalList.init(proposalListDescription, {
  ...commonModelOptions,
  tableName: 'proposal_list'
});

module.exports = {
  ProposalList,
  proposalListDescription
};
