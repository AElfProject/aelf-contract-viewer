/**
 * @file list reducer
 * @author yangmutong
 */
import {
  LOG_STATUS
} from '../common/constants';

const initialState = {
  instance: null,
  logStatus: LOG_STATUS.LOG_OUT,
  wallet: {
    // address: ''
  }
};

export const common = (state = initialState, { type }) => {
  switch (type) {
    default:
      return state;
  }
};
