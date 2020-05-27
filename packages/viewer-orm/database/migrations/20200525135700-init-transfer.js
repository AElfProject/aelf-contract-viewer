const {
  transferDescription
} = require('../../model/transfer');

const tableName = 'transfer';

module.exports = {
  up: async queryInterface => {
    await queryInterface.createTable(tableName, transferDescription);
    await queryInterface.addIndex(
      tableName,
      {
        fields: [
          {
            attribute: 'from'
          }
        ],
        name: 'from'
      }
    );
    await queryInterface.addIndex(
      tableName,
      {
        fields: [
          {
            attribute: 'to'
          }
        ],
        name: 'to'
      }
    );
    await queryInterface.addIndex(
      tableName,
      {
        fields: [
          {
            attribute: 'symbol'
          }
        ],
        name: 'symbol'
      }
    );
    await queryInterface.addIndex(
      tableName,
      {
        fields: [
          {
            attribute: 'related_chain_id'
          }
        ],
        name: 'related_chain_id'
      }
    );
  },
  down: queryInterface => queryInterface.dropTable(tableName)
};
