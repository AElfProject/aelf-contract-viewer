const {
  votesDescription
} = require('../../model/votes');

const tableName = 'votes';

module.exports = {
  up: async queryInterface => {
    await queryInterface.createTable(tableName, votesDescription);
    await queryInterface.addIndex(
      tableName,
      {
        fields: [
          {
            attribute: 'proposal_id'
          }
        ],
        name: 'proposal_id'
      }
    );
    await queryInterface.addIndex(
      tableName,
      {
        fields: [
          {
            attribute: 'voter'
          }
        ],
        name: 'voter'
      }
    );
    await queryInterface.addIndex(
      tableName,
      {
        fields: [
          {
            attribute: 'action'
          }
        ],
        name: 'action'
      }
    );
  },
  down: queryInterface => queryInterface.dropTable(tableName)
};
