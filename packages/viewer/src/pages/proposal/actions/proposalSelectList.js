/**
 * @file organization actions
 * @author atom-yang
 */
import { API_PATH } from '../common/constants';
import { request } from '../../../common/request';
import { arrayToMap } from '../common/utils';

export const GET_PROPOSAL_SELECT_LIST = arrayToMap([
  'SET_PROPOSALS_SELECT_LIST_START',
  'SET_PROPOSALS_SELECT_LIST_SUCCESS',
  'SET_PROPOSALS_SELECT_LIST_FAIL',
  'DESTORY'
]);


export const getProposalSelectList = params => async dispatch => {
  try {
    const result = await request(API_PATH.GET_PROPOSAL_LIST, params, {
      method: 'GET'
    });
    dispatch({
      type: GET_PROPOSAL_SELECT_LIST.SET_PROPOSALS_SELECT_LIST_START,
      payload: {
        params,
        list: result?.list ?? [],
        total: result?.total ?? 0,
        bpCount: result?.bpCount ?? 0
      }
    });
  } catch (e) {
    dispatch({
      type: GET_PROPOSAL_SELECT_LIST.SET_PROPOSALS_LIST_FAIL,
      payload: {}
    });
  }
};
