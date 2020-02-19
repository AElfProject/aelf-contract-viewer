/**
 * @file common actions
 * @author atom-yang
 */

/**
 * @file List actions
 * @author yangmutong
 */
import { arrayToMap } from '../common/utils';

// 登录
export const LOG_IN_ACTIONS = arrayToMap([
  'LOG_IN_START',
  'LOG_IN_SUCCESS',
  'LOG_IN_FAILED'
]);

export const logIn = params => async dispatch => {
  dispatch({
    type: LOG_IN_ACTIONS.LOG_IN_START,
    payload: params
  });
  try {
    // todo: 登录逻辑
    dispatch({
      type: LOG_IN_ACTIONS.LOG_IN_SUCCESS,
      payload: {}
    });
  } catch (e) {
    dispatch({
      type: LOG_IN_ACTIONS.LOG_IN_FAILED,
      payload: {}
    });
  }
};

// 登出
export const LOG_OUT_ACTIONS = arrayToMap([
  'LOG_OUT_START',
  'LOG_OUT_SUCCESS',
  'LOG_OUT_FAILED'
]);

export const logOut = params => async dispatch => {
  dispatch({
    type: LOG_OUT_ACTIONS.LOG_OUT_START,
    payload: params
  });
  try {
    // todo: 登出逻辑
    dispatch({
      type: LOG_OUT_ACTIONS.LOG_OUT_SUCCESS,
      payload: {}
    });
  } catch (e) {
    dispatch({
      type: LOG_OUT_ACTIONS.LOG_OUT_FAILED,
      payload: {}
    });
  }
};
