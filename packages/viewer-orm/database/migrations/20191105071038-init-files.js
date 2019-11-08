const {
  filesDescription
} = require('../../model/files');

const tableName = 'files';

module.exports = {
  up: async queryInterface => {
    await queryInterface.createTable(tableName, filesDescription);

    await queryInterface.addIndex(
      tableName,
      {
        fields: [
          {
            attribute: 'address'
          }
        ],
        name: 'address'
      }
    );
    await queryInterface.addIndex(
      tableName,
      {
        unique: true,
        fields: [
          {
            attribute: 'code_hash'
          }
        ],
        name: 'code_hash'
      }
    );
  },
  down: queryInterface => queryInterface.dropTable(tableName)
};
