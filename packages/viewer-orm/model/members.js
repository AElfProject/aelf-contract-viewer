/**
 * @file member description
 * @author atom-yang
 */
const Sequelize = require('sequelize');
const {
  formatTimeWithZone
} = require('../common/utils');
const { commonModelOptions } = require('../common/viewer');

const {
  Model,
  BIGINT,
  STRING,
  DATE,
  NOW,
  Op
} = Sequelize;

const membersDescription = {
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
  member: {
    type: STRING(255),
    allowNull: false
  },
  createdAt: {
    type: DATE,
    allowNull: false,
    defaultValue: NOW,
    field: 'created_at',
    get() {
      const time = this.getDataValue('createdAt');
      try {
        return formatTimeWithZone(time);
      } catch (e) {
        return time;
      }
    }
  }
};

class Members extends Model {
  static async getOrgAddressByMember(
    address,
    pageNum,
    pageSize,
    search = ''
  ) {
    let whereCondition = {
      member: address
    };
    if ((search || '').trim().length > 0) {
      whereCondition = {
        ...whereCondition,
        orgAddress: {
          [Op.substring]: search
        }
      };
    }
    const result = await Members.findAndCountAll({
      attributes: ['orgAddress'],
      where: whereCondition,
      order: [
        ['id', 'DESC']
      ],
      offset: (pageNum - 1) * +pageSize,
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

Members.init(membersDescription, {
  ...commonModelOptions,
  tableName: 'members'
});

module.exports = {
  Members,
  membersDescription
};
