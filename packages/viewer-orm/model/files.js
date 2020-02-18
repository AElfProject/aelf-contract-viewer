/**
 * @file files model
 * @author atom-yang
 */
const Sequelize = require('sequelize');
const { commonModelOptions } = require('../common/viewer');

const {
  Model,
  BIGINT,
  STRING,
  TEXT,
  BOOLEAN
} = Sequelize;

const filesDescription = {
  id: {
    type: BIGINT,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
    field: 'id'
  },
  address: {
    type: STRING(64),
    allowNull: false,
    field: 'address',
    comment: 'contract address'
  },
  codeHash: {
    type: STRING(255),
    allowNull: false,
    field: 'code_hash'
  },
  files: {
    type: TEXT('long'),
    allowNull: false,
    field: 'files'
  },
  status: {
    type: BOOLEAN,
    allowNull: false,
    field: 'status'
  }
};

class Files extends Model {
  static handleCodeResult(result) {
    if (!result) {
      return {};
    }
    const {
      status
    } = result;
    if (!status) {
      throw new Error('Contract decompile failed');
    }
    return result.toJSON();
  }

  static getLatestCodeHash() {
    return Files.findOne({
      attributes: ['codeHash'],
      order: [
        ['id', 'DESC']
      ]
    });
  }

  static async getFilesByAddress(address) {
    const result = await Files.findOne({
      where: {
        address
      },
      order: [
        ['id', 'DESC']
      ]
    });
    return Files.handleCodeResult(result);
  }

  static async getFilesByCodeHash(codeHash) {
    const result = await Files.findOne({
      where: {
        codeHash
      }
    });
    return Files.handleCodeResult(result);
  }
}

Files.init(filesDescription, {
  ...commonModelOptions,
  tableName: 'files'
});

module.exports = {
  Files,
  filesDescription
};
