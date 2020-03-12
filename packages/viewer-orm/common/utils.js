/**
 * @file common
 * @author atom-yang
 */
const moment = require('moment');

const AUTH_RETRIES = Symbol('authenticateRetries');

function sleep(timeout = 1000) {
  return new Promise(resolve => {
    setTimeout(() => resolve(), timeout);
  });
}

async function authenticate(database) {
  // eslint-disable-next-line no-param-reassign
  database[AUTH_RETRIES] = database[AUTH_RETRIES] || 0;

  try {
    await database.authenticate();
    console.log(`database ${database.config.database} authenticated`);
  } catch (e) {
    console.error(e);
    if (e.name !== 'SequelizeConnectionRefusedError') throw e;
    if (database[AUTH_RETRIES] >= 3) throw e;

    // sleep 2s to retry, max 3 times
    // eslint-disable-next-line no-param-reassign
    database[AUTH_RETRIES] += 1;
    await sleep(2000);
    await authenticate(database);
  }
}

function formatTimeWithZone(time, zone = 0) {
  return moment(time).utcOffset(zone).format('YYYY/MM/DD HH:mm:ssZ');
}

module.exports = {
  authenticate,
  formatTimeWithZone
};
