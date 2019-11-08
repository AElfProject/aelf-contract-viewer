const {
  blocksDescription
} = require('../../model/blocks');

module.exports = {
  up: async queryInterface => {
    await queryInterface.createTable('blocks', blocksDescription);
  },
  down: queryInterface => queryInterface.dropTable('blocks')
};
