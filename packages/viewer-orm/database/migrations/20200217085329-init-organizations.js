const {
  organizationDescription
} = require('../../model/organizations');

const tableName = 'organizations';

module.exports = {
  up: async queryInterface => {
    await queryInterface.createTable(tableName, organizationDescription);
    await queryInterface.addIndex(
      tableName,
      {
        // unique: true,
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
            attribute: 'creator'
          }
        ],
        name: 'creator'
      }
    );
    await queryInterface.addIndex(
      tableName,
      {
        fields: [
          {
            attribute: 'proposal_type'
          }
        ],
        name: 'proposal_type'
      }
    );
  },
  down: queryInterface => queryInterface.dropTable(tableName)
};
