const {
  codeDescription
} = require('../../model/code');

const tableName = 'code';

module.exports = {
  up: async queryInterface => {
    await queryInterface.createTable(tableName, codeDescription);
    await queryInterface.addIndex(
      tableName,
      {
        fields: [
          {
            attribute: 'address'
          }
        ],
        name: 'address'
      }
    );
    await queryInterface.addIndex(
      tableName,
      {
        fields: [
          {
            attribute: 'author'
          }
        ],
        name: 'author'
      }
    );
    await queryInterface.addIndex(
      tableName,
      {
        unique: true,
        fields: [
          {
            attribute: 'code_hash'
          }
        ],
        name: 'code_hash'
      }
    );
    await queryInterface.addIndex(
      tableName,
      {
        unique: true,
        fields: [
          {
            attribute: 'tx_id'
          }
        ],
        name: 'tx_id'
      }
    );
    await queryInterface.addIndex(
      tableName,
      {
        fields: [
          {
            attribute: 'block_height'
          }
        ],
        name: 'block_height'
      }
    );
  },
  down: queryInterface => queryInterface.dropTable(tableName)
};
