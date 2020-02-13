/**
 * @file organization model
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
  JSON,
  DATE,
  NOW,
  Op
} = Sequelize;

const {
  constants
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
  orgHash: {
    type: STRING(255),
    allowNull: false,
    field: 'org_hash'
  },
  txId: {
    type: STRING(255),
    allowNull: false,
    field: 'tx_id',
    unique: true,
    comment: 'tx id of creating org'
  },
  creator: {
    type: STRING(255),
    allowNull: false,
    field: 'creator'
  },
  proposalType: {
    type: ENUM(
      constants.proposalTypes.REFERENDUM,
      constants.proposalTypes.PARLIAMENT,
      constants.proposalTypes.ASSOCIATION
    ),
    allowNull: false,
    field: 'proposal_type',
    comment: 'audit model of proposal'
  },
  createdAt: {
    type: DATE,
    allowNull: false,
    defaultValue: NOW,
    field: 'create_at'
  },
  releaseThreshold: {
    type: JSON,
    allowNull: false,
    field: 'release_threshold',
    get() {
      const data = this.getDataValue('releaseThreshold');
      try {
        return JSON.parse(data);
      } catch (e) {
        return data || {};
      }
    }
  },
  leftOrgInfo: {
    type: JSON,
    allowNull: false,
    field: 'left_org_info',
    get() {
      const data = this.getDataValue('leftOrgInfo');
      try {
        return JSON.parse(data);
      } catch (e) {
        return data || {};
      }
    }
  }
};

class Organizations extends Model {
  static async getOrganizations(proposalType, pageNum, pageSize, search = '') {
    let whereCondition = {
      proposalType
    };
    if ((search || '').trim().length > 0) {
      whereCondition = {
        ...whereCondition,
        orgAddress: {
          [Op.substring]: search
        }
      };
    }
    const result = await Organizations.findAndCountAll({
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

  static async getAuditOrganizations(proposalType, search = '') {
    let whereCondition = {
      proposalType
    };
    if ((search || '').trim().length > 0) {
      whereCondition = {
        ...whereCondition,
        orgAddress: {
          [Op.substring]: search
        }
      };
    }
    return Organizations.findAll({
      attributes: ['orgAddress', 'leftOrgInfo'],
      where: whereCondition
    });
  }

  static async getBatchOrganizations(list) {
    return Organizations.findAll({
      attributes: {
        exclude: ['id']
      },
      where: {
        orgAddress: {
          [Op.in]: list
        }
      }
    });
  }
}

Organizations.init(organizationDescription, {
  ...commonModelOptions,
  tableName: 'organizations'
});

module.exports = {
  Organizations,
  organizationDescription
};
