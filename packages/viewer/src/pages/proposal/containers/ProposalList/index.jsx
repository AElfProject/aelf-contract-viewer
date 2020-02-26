/**
 * @file proposal list
 * @author atom-yang
 */
import React, { useEffect, useState } from 'react';
import {
  If, Then, Switch, Case
} from 'react-if';
import { useSelector, useDispatch, shallowEqual } from 'react-redux';
import {
  Tabs,
  Pagination,
  Input,
  Checkbox,
  Select,
  Spin,
  Row,
  Col,
  Empty,
  Result,
  message
} from 'antd';
import Total from '../../components/Total';
import constants, { LOADING_STATUS, LOG_STATUS } from '../../common/constants';
import Proposal from './Proposal';
import { getProposals } from '../../actions/proposalList';
import ApproveTokenModal from './ApproveTokenModal';
import './index.less';
import { getContractAddress, sendTransaction } from '../../common/utils';

const { TabPane } = Tabs;
const { Search } = Input;
const { Option } = Select;
const {
  proposalTypes,
  proposalStatus
} = constants;

// todo: 错误处理，空列表
const ProposalList = () => {
  const common = useSelector(state => state.common, shallowEqual);
  const proposalList = useSelector(state => state.proposals, shallowEqual);
  const [proposalInfo, setProposalInfo] = useState({
    tokenSymbol: 'ELF',
    action: 'Approve',
    visible: false
  });
  const {
    bpCount,
    params,
    total,
    list,
    isAudit,
    status: loadingStatus
  } = proposalList;
  const {
    aelf,
    logStatus,
    isALLSettle,
    wallet,
    currentWallet
  } = common;
  const dispatch = useDispatch();
  const [searchValue, setSearchValue] = useState(params.search);
  // const { proposalType } = useParams();

  const fetchList = async param => {
    let signParams = { ...param };
    if (logStatus === LOG_STATUS.LOGGED) {
      try {
        const timestamp = `${new Date().getTime()}`;
        const signature = await wallet.sign(timestamp);
        signParams = {
          ...signParams,
          address: currentWallet.address,
          signature,
          pubKey: currentWallet.publicKey,
          timestamp
        };
      } catch (e) {
        message.warn((e.errorMessage || {}).message || 'night ELF is locked');
      }
    } else {
      delete signParams.address;
      delete signParams.signature;
      delete signParams.timestamp;
      delete signParams.pubKey;
    }
    dispatch(getProposals(signParams));
  };
  useEffect(() => {
    if (isALLSettle === true) {
      fetchList(params);
    }
  }, [isALLSettle, logStatus]);

  useEffect(() => {
    console.log('in changed');
    setSearchValue(params.search);
  }, [params.search]);

  const onPageNumChange = pageNum => fetchList({
    ...params,
    pageNum
  });

  const onSearch = value => {
    if (value && value.trim().length > 0) {
      fetchList({
        ...params,
        pageNum: 1,
        search: value.trim()
      });
    }
  };

  const handleStatusChange = value => {
    fetchList({
      ...params,
      pageNum: 1,
      status: value
    });
  };

  const handleContractFilter = e => {
    fetchList({
      ...params,
      pageNum: 1,
      isContract: e.target.checked ? 1 : 0
    });
  };
  const handleTabChange = key => {
    fetchList({
      ...params,
      pageNum: 1,
      proposalType: key,
      status: proposalStatus.ALL,
      isContract: 0,
      search: ''
    });
  };

  const send = async (id, action) => {
    if (params.proposalType === proposalTypes.REFERENDUM) {
      const proposal = list.filter(item => item.proposalId === id)[0];
      setProposalInfo({
        ...proposalInfo,
        tokenSymbol: proposal.organizationInfo.leftOrgInfo.tokenSymbol,
        action,
        proposalId: proposal.proposalId,
        visible: true
      });
    } else {
      await sendTransaction(wallet, getContractAddress(params.proposalType), action, id);
    }
  };

  async function handleConfirm(action) {
    if (action) {
      await sendTransaction(wallet, getContractAddress(params.proposalType), action, proposalInfo.proposalId);
    }
    setProposalInfo({
      visible: false
    });
  }

  const handleRelease = async event => {
    const id = event.target.getAttribute('proposal-id');
    await sendTransaction(wallet, getContractAddress(params.proposalType), 'Release', id);
  };
  const handleApprove = async event => {
    const id = event.target.getAttribute('proposal-id');
    await send(id, 'Approve');
  };
  const handleReject = async event => {
    const id = event.target.getAttribute('proposal-id');
    await send(id, 'Reject');
  };
  const handleAbstain = async event => {
    const id = event.target.getAttribute('proposal-id');
    await send(id, 'Abstain');
  };

  return (
    <div className="proposal-list">
      <Tabs
        className="proposal-list-tab"
        activeKey={params.proposalType}
        onChange={handleTabChange}
        animated={false}
      >
        <TabPane
          tab={proposalTypes.PARLIAMENT}
          key={proposalTypes.PARLIAMENT}
        />
        <TabPane
          tab={proposalTypes.ASSOCIATION}
          key={proposalTypes.ASSOCIATION}
        />
        <TabPane
          tab={proposalTypes.REFERENDUM}
          key={proposalTypes.REFERENDUM}
        />
      </Tabs>
      <div className="proposal-list-filter gap-bottom">
        <If condition={params.proposalType === proposalTypes.PARLIAMENT}>
          <Then>
            <Checkbox onChange={handleContractFilter} className="gap-bottom-large">
              Deploy/Update Contract Proposal
            </Checkbox>
          </Then>
        </If>
        <div className="proposal-list-filter-form">
          <div className="proposal-list-filter-form-select">
            <span className="sub-title gap-right">Status: </span>
            <Select
              defaultValue={proposalStatus.ALL}
              value={params.status}
              onChange={handleStatusChange}
            >
              <Option value={proposalStatus.ALL}>{proposalStatus.ALL}</Option>
              <Option value={proposalStatus.PENDING}>{proposalStatus.PENDING}</Option>
              <Option value={proposalStatus.APPROVED}>{proposalStatus.APPROVED}</Option>
              <Option value={proposalStatus.RELEASED}>{proposalStatus.RELEASED}</Option>
              <Option value={proposalStatus.EXPIRED}>{proposalStatus.EXPIRED}</Option>
            </Select>
          </div>
          <Search
            className="proposal-list-filter-form-input"
            placeholder="Proposal ID/Contract Address/Proposer"
            defaultValue={params.search}
            allowClear
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
            onSearch={onSearch}
          />
        </div>
      </div>
      <div className="proposal-list-list">
        <Switch>
          <Case condition={loadingStatus === LOADING_STATUS.LOADING || loadingStatus === LOADING_STATUS.SUCCESS}>
            <Spin spinning={loadingStatus === LOADING_STATUS.LOADING}>
              <Row gutter={16}>
                {list.map(item => (
                  <Col span={12} key={item.proposalId}>
                    <Proposal
                      bpCount={bpCount}
                      isAudit={isAudit}
                      {...item}
                      logStatus={logStatus}
                      currentAccount={currentWallet.address}
                      handleRelease={handleRelease}
                      handleAbstain={handleAbstain}
                      handleApprove={handleApprove}
                      handleReject={handleReject}
                    />
                  </Col>
                ))}
              </Row>
            </Spin>
          </Case>
          <Case condition={loadingStatus === LOADING_STATUS.FAILED}>
            <Result
              status="error"
              title="Error Happened"
              subTitle="Please check your network"
            />
          </Case>
        </Switch>
        <If condition={loadingStatus === LOADING_STATUS.SUCCESS && list.length === 0}>
          <Then>
            <Empty />
          </Then>
        </If>
      </div>
      <Pagination
        className="float-right gap-top"
        showQuickJumper
        total={total}
        current={params.pageNum}
        pageSize={params.pageSize}
        hideOnSinglePage
        onChange={onPageNumChange}
        showTotal={Total}
      />
      {
        proposalInfo.visible ? (
          <ApproveTokenModal
            aelf={aelf}
            proposalType={params.proposalType}
            {...proposalInfo}
            onCancel={handleConfirm}
            onConfirm={handleConfirm}
            wallet={wallet}
          />
        ) : null
      }
    </div>
  );
};

export default React.memo(ProposalList);
