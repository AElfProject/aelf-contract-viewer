/**
 * @file proposal list model
 * @author atom-yang
 */
const Sequelize = require('sequelize');
const { commonModelOptions } = require('../common');
const config = require('../config');

const {
  Model,
  BIGINT,
  STRING,
  ENUM,
  DATE,
  NOW,
  TEXT,
  Op
} = Sequelize;

const {
  constants: {
    proposalStatus,
    proposalTypes
  }
} = config;

const organizationDescription = {
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
    comment: 'proposal created time'
  },
  proposalId: {
    type: STRING(255),
    allowNull: false,
    field: 'proposal_id',
    unique: true
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
    allowNull: false,
    field: 'contract_params'
  },
  expiredTime: {
    type: DATE,
    allowNull: false,
    defaultValue: NOW,
    field: 'expired_time'
  },
  // todo: 需要除以token的decimals
  approvals: {
    type: BIGINT,
    allowNull: false,
    defaultValue: 0
  },
  rejections: {
    type: BIGINT,
    allowNull: false,
    defaultValue: 0
  },
  abstentions: {
    type: BIGINT,
    allowNull: false,
    defaultValue: 0
  },
  status: {
    type: ENUM(
      proposalStatus.PENDING,
      proposalStatus.APPROVED,
      proposalStatus.REJECTED,
      proposalStatus.ABSTAINED,
      proposalStatus.MINED,
      proposalStatus.FAILED
    ),
    allowNull: false,
    comment: 'proposal status'
  },
  updateTime: {
    type: DATE,
    allowNull: false,
    defaultValue: NOW,
    field: 'update_time'
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
    field: 'released_time'
  },
  contractRelated: {
    type: ENUM('NO', 'DEPLOY', 'UPDATE'),
    allowNull: false,
    field: 'contract_related',
    defaultValue: 'NO',
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
          status: {
            [Op.in]: [proposalStatus.PENDING, proposalStatus.APPROVED]
          }
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
        contractRelated: {
          [Op.in]: ['DEPLOY', 'UPDATE']
        }
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
      limit: pageSize
    });
    const total = result.count;
    const list = result.rows.map(v => v.toJSON());
    return {
      total,
      list
    };
  }
}

ProposalList.init(organizationDescription, {
  ...commonModelOptions,
  tableName: 'proposal_list'
});

module.exports = {
  ProposalList,
  organizationDescription
};
