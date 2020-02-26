const {
  scanCursorDescription
} = require('../../model/scanCursor');

const tableName = 'scan_cursor';

module.exports = {
  up: async queryInterface => {
    await queryInterface.createTable(tableName, scanCursorDescription);
  },
  down: queryInterface => queryInterface.dropTable(tableName)
};
