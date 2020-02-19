/**
 * @file organization actions
 * @author atom-yang
 */
export const SET_CURRENT_PROPOSALS_DETAIL = 'SET_CURRENT_PROPOSALS_DETAIL';

export const setCurrentProposal = proposalInfo => ({ type: SET_CURRENT_PROPOSALS_DETAIL, payload: proposalInfo });
