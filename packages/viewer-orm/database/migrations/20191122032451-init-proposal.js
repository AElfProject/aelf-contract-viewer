const {
  proposalDescription
} = require('../../model/proposal');

const tableName = 'proposal';

module.exports = {
  up: async queryInterface => {
    await queryInterface.createTable(tableName, proposalDescription);
    await queryInterface.addIndex(
      tableName,
      {
        unique: true,
        fields: [
          {
            attribute: 'proposal_id'
          }
        ],
        name: 'proposal_id'
      }
    );
  },
  down: queryInterface => queryInterface.dropTable(tableName)
};
