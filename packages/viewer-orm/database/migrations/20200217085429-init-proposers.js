const {
  proposersDescription
} = require('../../model/proposers');

const tableName = 'proposers';

module.exports = {
  up: async queryInterface => {
    await queryInterface.createTable(tableName, proposersDescription);
    await queryInterface.addIndex(
      tableName,
      {
        fields: [
          {
            attribute: 'proposer'
          }
        ],
        name: 'proposer'
      }
    );
    await queryInterface.addIndex(
      tableName,
      {
        fields: [
          {
            attribute: 'org_address'
          }
        ],
        name: 'org_address'
      }
    );
  },
  down: queryInterface => queryInterface.dropTable(tableName)
};
