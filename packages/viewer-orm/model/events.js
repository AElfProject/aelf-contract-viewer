/**
 * @file events model
 * @author atom-yang
 */
const Sequelize = require('sequelize');
const { scanModelOptions } = require('../common/scan');

const {
  Model,
  BIGINT,
  STRING,
  TEXT
} = Sequelize;

const eventsDescription = {
  id: {
    type: BIGINT,
    allowNull: false,
    primaryKey: true,
    field: 'id'
  },
  txId: {
    type: STRING(64),
    allowNull: false,
    field: 'tx_id'
  },
  address: {
    type: STRING(64),
    allowNull: false
  },
  name: {
    type: STRING(255),
    allowNull: false
  },
  data: {
    type: TEXT,
    allowNull: false,
    get() {
      const data = this.getDataValue('data');
      try {
        return JSON.parse(data);
      } catch (e) {
        return data;
      }
    }
  }
};

class Events extends Model {
  static async getEventsList(address, pageNum, pageSize) {
    const result = await Events.findAndCountAll({
      order: [
        ['id', 'DESC']
      ],
      where: {
        address
      },
      limit: +pageSize,
      offset: (pageNum - 1) * pageSize
    });
    const total = result.count;
    const list = result.rows.map(v => v.toJSON());
    return {
      total,
      list
    };
  }
}

Events.init(eventsDescription, {
  ...scanModelOptions,
  tableName: 'events'
});

module.exports = {
  Events,
  eventsDescription
};
