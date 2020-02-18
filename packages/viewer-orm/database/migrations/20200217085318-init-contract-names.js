const {
  contractNamesDescription
} = require('../../model/contractNames');

const tableName = 'contract_names';

module.exports = {
  up: async queryInterface => {
    await queryInterface.createTable(tableName, contractNamesDescription);
  },
  down: queryInterface => queryInterface.dropTable(tableName)
};
