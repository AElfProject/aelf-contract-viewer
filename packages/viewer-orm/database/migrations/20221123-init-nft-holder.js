const {
  nftHolderDescription
} = require('../../model/nftHolders');

const tableName = 'nft_holder';

module.exports = {
  up: async queryInterface => {
    await queryInterface.createTable(tableName, nftHolderDescription);
  },
  down: queryInterface => queryInterface.dropTable(tableName)
};
