/**
 * @file constants
 * @author atom-yang
 */
import PropTypes from 'prop-types';
import AElf from 'aelf-sdk';
import config from '../../../common/config';

const { constants, viewer, wallet } = config;

export const FAKE_WALLET = AElf.wallet.getWalletByPrivateKey(wallet.privateKey);

export const API_PATH = {
  GET_ALL_CONTRACTS: '/api/viewer/allContracts',
  GET_PROPOSAL_LIST: '/api/proposal/list',
  GET_PROPOSAL_INFO: '/api/proposal/proposalInfo',
  GET_TOKEN_LIST: '/api/proposal/tokenList',
  CHECK_CONTRACT_NAME: '/api/proposal/checkContractName',
  ADD_CONTRACT_NAME: '/api/proposal/addContractName',
  GET_AUDIT_ORGANIZATIONS: '/api/proposal/auditOrganizations',
  GET_ORGANIZATIONS: '/api/proposal/organizations',
  GET_VOTED_LIST: '/api/proposal/votedList',
  GET_PERSONAL_VOTED_LIST: '/api/proposal/personalVotedList',
  GET_CONTRACT_NAME: '/api/viewer/getContractName'
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

export const organizationInfoPropTypes = {
  releaseThreshold: PropTypes.shape({
    minimalApprovalThreshold: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.string
    ]).isRequired,
    maximalRejectionThreshold: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.string
    ]).isRequired,
    maximalAbstentionThreshold: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.string
    ]).isRequired,
    minimalVoteThreshold: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.string
    ]).isRequired
  }).isRequired,
  orgAddress: PropTypes.string.isRequired,
  orgHash: PropTypes.string.isRequired,
  txId: PropTypes.string.isRequired,
  createdAt: PropTypes.string.isRequired,
  updatedAt: PropTypes.string.isRequired,
  creator: PropTypes.string.isRequired,
  proposalType: PropTypes.oneOf(Object.values(constants.proposalTypes)).isRequired,
  leftOrgInfo: PropTypes.shape({
    proposerAuthorityRequired: PropTypes.bool,
    parliamentMemberProposingAllowed: PropTypes.bool,
    tokenSymbol: PropTypes.string,
    proposerWhiteList: PropTypes.shape({
      proposers: PropTypes.arrayOf(PropTypes.string)
    }),
    organizationMemberList: PropTypes.shape({
      organizationMembers: PropTypes.arrayOf(PropTypes.string)
    })
  })
};

const { proposalStatus, proposalActions } = constants;

export const ACTIONS_COLOR_MAP = {
  [proposalActions.APPROVE]: '#05ac90',
  [proposalActions.REJECT]: '#d34a64',
  [proposalActions.ABSTAIN]: '#646464',
};

const fullProposalStatus = {
  ...proposalStatus,
  ALL: 'all',
  EXPIRED: 'expired'
};

export const STATUS_COLOR_MAP = {
  [fullProposalStatus.PENDING]: '#d34a64',
  [fullProposalStatus.APPROVED]: '#05ac90',
  [fullProposalStatus.RELEASED]: '#5c28a9',
  [fullProposalStatus.EXPIRED]: '#646464',
};

export const CONTRACT_TEXT_MAP = {
  ProposeContractCodeCheck: 'Check Contract Code',
  DeploySmartContract: 'Deploy Contract',
  UpdateSmartContract: 'Update Contract'
};

export default {
  ...constants,
  proposalStatus: {
    ...proposalStatus,
    ALL: 'all',
    EXPIRED: 'expired'
  },
  viewer,
  DEFAUT_RPCSERVER:
    process.env.NODE_ENV === 'production'
      ? `${window.location.protocol}//${window.location.host}/chain` : 'http://18.163.40.216:8000',
  APP_NAME: 'explorer.aelf.io'
};
