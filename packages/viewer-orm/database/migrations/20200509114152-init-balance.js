const {
  balanceDescription
} = require('../../model/balance');

const tableName = 'balance';

module.exports = {
  up: async queryInterface => {
    await queryInterface.createTable(tableName, balanceDescription);
    await queryInterface.addIndex(
      tableName,
      {
        fields: [
          {
            attribute: 'owner'
          }
        ],
        name: 'owner'
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
  },
  down: queryInterface => queryInterface.dropTable(tableName)
};
