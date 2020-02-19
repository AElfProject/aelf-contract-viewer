/**
 * @file root reducer
 * @author atom-yang
 */
import { combineReducers } from 'redux';
import { common } from './common';
import { getOrganization } from './organizationList';
import { getProposalList } from './proposalList';
import { setCurrentProposal } from './proposalDetail';

const root = combineReducers({
  common,
  organizations: getOrganization,
  proposals: getProposalList,
  currentProposal: setCurrentProposal
});

export default root;
