module.exports = {
  up: async () => {},
  down: queryInterface => queryInterface.dropTable('blocks')
};
