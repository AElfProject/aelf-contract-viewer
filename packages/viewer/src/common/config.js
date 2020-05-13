/**
 * @file config
 * @author atom-yang
 */
import config from '../../../../config.json';

export default {
  ...config,
  API_PATH: {
    GET_TRANSACTION_BY_ADDRESS: '/api/address/transactions',
    GET_ALL_CONTRACT_NAME: '/api/viewer/allContracts',
    GET_BALANCES_BY_ADDRESS: '/api/viewer/balances',
    GET_ACCOUNT_LIST: '/api/viewer/accountList',
    GET_TOKEN_LIST: '/api/proposal/tokenList'
  }
};
