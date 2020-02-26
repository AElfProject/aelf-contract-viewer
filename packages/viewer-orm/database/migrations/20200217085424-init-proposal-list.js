const {
  proposalListDescription
} = require('../../model/proposalList');

const tableName = 'proposal_list';

module.exports = {
  up: async queryInterface => {
    await queryInterface.createTable(tableName, proposalListDescription);
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
        unique: true,
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
            attribute: 'expired_time'
          }
        ],
        name: 'expired_time'
      }
    );
    await queryInterface.addIndex(
      tableName,
      {
        fields: [
          {
            attribute: 'status'
          }
        ],
        name: 'status'
      }
    );
    await queryInterface.addIndex(
      tableName,
      {
        fields: [
          {
            attribute: 'created_by'
          }
        ],
        name: 'created_by'
      }
    );
    await queryInterface.addIndex(
      tableName,
      {
        fields: [
          {
            attribute: 'is_contract_deployed'
          }
        ],
        name: 'is_contract_deployed'
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
