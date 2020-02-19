/**
 * @file constants
 * @author atom-yang
 */
import config from '../../../common/config';

const { constants } = config;

export const API_PATH = {
  GET_ALL_CONTRACTS: '/api/viewer/allContracts',
  GET_PROPOSAL_LIST: '/api/proposal/list',
  GET_PROPOSAL_PARAMS: '/api/proposal/params',
  GET_TOKEN_LIST: '/api/proposal/tokenList',
  CHECK_CONTRACT_NAME: '/api/proposal/checkContractName',
  ADD_CONTRACT_NAME: '/api/proposal/addContractName',
  GET_AUDIT_ORGANIZATIONS: '/api/proposal/auditOrganizations',
  GET_ORGANIZATIONS: '/api/proposal/organizations',
  GET_VOTED_LIST: '/api/proposal/votedList',
  GET_PERSONAL_VOTED_LIST: '/api/proposal/personalVotedList',
};

export const LOG_STATUS = {
  LOGGED: 'logged',
  LOG_OUT: 'log_out'
};

export const LOADING_STATUS = {
  LOADING: 'loading',
  SUCCESS: 'success',
  FAILED: 'failed'
};

const { proposalStatus } = constants;

export default {
  ...constants,
  proposalStatus: {
    ...proposalStatus,
    ALL: 'all',
    EXPIRED: 'expired'
  }
};
