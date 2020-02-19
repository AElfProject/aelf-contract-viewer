/**
 * @file organization list reducer
 * @author atom-yang
 */
import {
  SET_CURRENT_PROPOSALS_DETAIL
} from '../actions/proposalDetail';

const initialState = {
  currentProposalInfo: {}
};

export const setCurrentProposal = (state = initialState, { type, payload }) => {
  switch (type) {
    case SET_CURRENT_PROPOSALS_DETAIL:
      return {
        currentProposalInfo: payload
      };
    default:
      return state;
  }
};
