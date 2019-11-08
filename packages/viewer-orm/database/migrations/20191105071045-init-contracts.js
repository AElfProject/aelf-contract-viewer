const {
  contractsDescription
} = require('../../model/contracts');

const tableName = 'contracts';

module.exports = {
  up: async queryInterface => {
    await queryInterface.createTable(tableName, contractsDescription);
    await queryInterface.addIndex(
      tableName,
      {
        unique: true,
        fields: [
          {
            attribute: 'address'
          }
        ],
        name: 'address'
      }
    );
  },
  down: queryInterface => queryInterface.dropTable(tableName)
};
