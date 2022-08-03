import React, { useCallback, useState, useEffect } from 'react';
import { Form, message, Select } from 'antd';
import { useSelector } from 'react-redux';
import { request } from '../../../../common/request';
import { API_PATH } from '../../common/constants';

const toBottomDistance = 30;

// eslint-disable-next-line consistent-return
export const getProposalList = async params => {
  try {
    const result = await request(API_PATH.GET_PROPOSAL_LIST, params, {
      method: 'GET'
    });
    return result;
  } catch (e) {
    return e;
  }
};

let isFetch = false;
let timeout = null;
let currentValue = '';

// TODO reducer
const ProposalSearch = () => {
  const [proposalIdList, setProposalIdList] = useState([]);
  const common = useSelector(state => state.common);
  const {
    currentWallet
  } = common;
  const [param, setParam] = useState({
    pageSize: 20,
    pageNum: 1,
    proposalType: 'Parliament',
    isContract: 1,
    address: currentWallet.address,
    search: '',
    // TODO
    status: 'all',
  });

  useEffect(() => {
    getProposalList(param)
      .then(res => {
        setProposalIdList(v => {
          const allList = v.concat(res?.list || []);
          isFetch = !(res.total >= allList.length);
          return v.concat(res?.list || []);
        });
      })
      .catch(e => {
        message.error(e.message || 'Network Error');
      });
  }, [param]);

  const proposalIdSearch = useCallback(newValue => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    currentValue = newValue;
    timeout = setTimeout(() => {
      clearTimeout(timeout);
      setParam(v => ({
        ...v,
        search: currentValue,
        pageNum: 1
      }));
      setProposalIdList([]);
    }, 300);
  }, []);

  const onPopupScroll = useCallback(e => {
    const popup = e.currentTarget;
    const popupChild = popup.children[0];
    const wrapperHeight = popup.clientHeight;
    const innerHeight = popupChild?.clientHeight;
    const toBottom = innerHeight - wrapperHeight;
    if ((popup.scrollTop + toBottomDistance > toBottom) && !isFetch) {
      isFetch = true;
      setParam(v => ({ ...v, pageNum: v.pageNum + 1 }));
    }
  }, []);

  return (
    <Form.Item
      label="Proposal ID:"
      name="proposalId"
      rules={[
        {
          required: true,
          message: 'Please choose a Proposal ID！'
        }
      ]}
    >
      <Select
        dropdownClassName="proposal-dropdown-option"
        showSearch
        onSearch={proposalIdSearch}
        filterOption={false}
        onPopupScroll={onPopupScroll}
        // open
      >
        {proposalIdList.map(item => (
          <Select.Option
            key={item.proposalId}
            value={item.proposalId}
          >
            {item.proposalId}
          </Select.Option>
        ))}
      </Select>
    </Form.Item>
  );
};


export default ProposalSearch;
