/**
 * @file common formatter
 * @author atom-yang
 */

function isTransactionMined(status) {
  return (status || '').toUpperCase() === 'MINED';
}

module.exports = {
  isTransactionMined
};
