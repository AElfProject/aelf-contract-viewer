const {
  membersDescription
} = require('../../model/members');

const tableName = 'members';

module.exports = {
  up: async queryInterface => {
    await queryInterface.createTable(tableName, membersDescription);
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
    await queryInterface.addIndex(
      tableName,
      {
        fields: [
          {
            attribute: 'member'
          }
        ],
        name: 'member'
      }
    );
  },
  down: queryInterface => queryInterface.dropTable(tableName)
};
