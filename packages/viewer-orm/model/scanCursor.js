/**
 * @file scan cursor model
 * @author atom-yang
 */
const Sequelize = require('sequelize');
const { commonModelOptions } = require('../common/viewer');

const {
  Model,
  BIGINT,
  STRING
} = Sequelize;

const scanCursorDescription = {
  id: {
    type: BIGINT,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
    field: 'id'
  },
  scannerName: {
    type: STRING(255),
    allowNull: false,
    field: 'scanner_name'
  },
  lastId: {
    type: BIGINT,
    allowNull: false,
    field: 'last_id'
  }
};

class ScanCursor extends Model {
  static async getLastId(name) {
    const result = await ScanCursor.findAll({
      where: {
        scannerName: name
      },
      order: [
        ['id', 'DESC']
      ],
      limit: 1
    });
    return result.length > 0 ? result[0].lastId : false;
  }

  static insertIncId(id, name) {
    return ScanCursor.create({
      lastId: id,
      scannerName: name
    });
  }

  static updateLastIncId(id, name, options = {}) {
    return ScanCursor.update({
      lastId: id
    }, {
      where: {
        scannerName: name
      },
      ...options
    });
  }
}

ScanCursor.init(scanCursorDescription, {
  ...commonModelOptions,
  tableName: 'scan_cursor'
});

module.exports = {
  ScanCursor,
  scanCursorDescription
};
