const {
  transferDescription
} = require('../../model/nftTransfer');

const tableName = 'nft_transfer';

module.exports = {
  up: queryInterface => queryInterface.createTable(tableName, transferDescription),
  down: queryInterface => queryInterface.dropTable('NftTransfers')
};
