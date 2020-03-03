/**
 * @file proposal detail
 * @author atom-yang
 */
import React, { useState, useEffect } from 'react';
import moment from 'moment';
import PropTypes from 'prop-types';
import {
  useParams,
  useHistory,
  Redirect
} from 'react-router-dom';
import {
  Tag,
  Button,
  Divider,
  PageHeader,
  Skeleton,
  Result,
  Row,
  Col,
  Tabs
} from 'antd';
import {
  useSelector,
  useDispatch
} from 'react-redux';
import Title from 'antd/lib/typography/Title';
import {
  ACTIONS_ICON_MAP
} from '../ProposalList/Proposal';
import constants, {
  ACTIONS_COLOR_MAP,
  API_PATH,
  CONTRACT_TEXT_MAP,
  LOADING_STATUS,
  LOG_STATUS,
  STATUS_COLOR_MAP,
  PROPOSAL_STATUS_CAPITAL
} from '../../common/constants';
import { request } from '../../../../common/request';
import VoteData from './VoteData';
import VoteDetail from './VoteDetail';
import OrganizationCard from './OrganizationCard';
import ContractDetail from './ContractDetail';
import config from '../../../../common/config';
import './index.less';
import {
  getContractAddress,
  sendTransaction,
  getSignParams
} from '../../common/utils';
import ApproveTokenModal from '../ProposalList/ApproveTokenModal';
import { LOG_IN_ACTIONS } from '../../actions/common';

const {
  viewer
} = config;

const {
  TabPane
} = Tabs;

const {
  proposalTypes,
  proposalStatus
} = constants;

async function getData(proposalId, wallet, currentWallet, logStatus, dispatch) {
  let signedParams = {};
  if (logStatus === LOG_STATUS.LOGGED) {
    signedParams = await getSignParams(wallet, currentWallet);
    if (Object.keys(signedParams).length === 0) {
      dispatch({
        type: LOG_IN_ACTIONS.LOG_IN_FAILED
      });
    }
  }
  return request(API_PATH.GET_PROPOSAL_INFO, {
    ...signedParams,
    proposalId
  }, { method: 'GET' });
}

function CountDown(props) {
  const {
    time,
    status
  } = props;
  if (!time) {
    return null;
  }
  const now = moment();
  const threshold = moment().add(3, 'days');
  const expired = moment(time);
  const show = status !== proposalStatus.RELEASED && expired.isAfter(now)
  && expired.isBefore(threshold);
  return show
    ? (<span className="warning-text">{`Expire ${now.to(expired)}`}</span>) : null;
}

CountDown.propTypes = {
  time: PropTypes.string,
  status: PropTypes.oneOf(Object.values(proposalStatus)).isRequired
};

CountDown.defaultProps = {
  time: ''
};

function Extra(props) {
  const {
    status,
    expiredTime,
    logStatus,
    currentWallet,
    proposer,
    handleRelease
  } = props;
  let realProposalStatus = status;
  if (status === proposalStatus.APPROVED || status === proposalStatus.PENDING) {
    realProposalStatus = moment(expiredTime).isBefore(moment()) ? proposalStatus.EXPIRED : status;
  }
  const canRelease = logStatus === LOG_STATUS.LOGGED && currentWallet && proposer === currentWallet.address;
  return (
    <div className="proposal-list-item-id-status">
      <Tag color={STATUS_COLOR_MAP[realProposalStatus]}>{PROPOSAL_STATUS_CAPITAL[realProposalStatus]}</Tag>
      {realProposalStatus === proposalStatus.APPROVED && canRelease
        // eslint-disable-next-line max-len
        ? (<Button type="link" size="small" onClick={handleRelease}>Release&gt;</Button>) : null}
    </div>
  );
}

Extra.propTypes = {
  currentWallet: PropTypes.shape({
    address: PropTypes.string,
    publicKey: PropTypes.string
  }).isRequired,
  expiredTime: PropTypes.string.isRequired,
  status: PropTypes.oneOf(Object.values(proposalStatus)).isRequired,
  logStatus: PropTypes.oneOf(Object.values(LOG_STATUS)).isRequired,
  proposer: PropTypes.string.isRequired,
  handleRelease: PropTypes.func.isRequired
};

const ProposalDetail = () => {
  const {
    proposalId = ''
  } = useParams();
  const history = useHistory();
  const dispatch = useDispatch();
  const common = useSelector(state => state.common);
  const [visible, setVisible] = useState(false);
  const {
    logStatus,
    aelf,
    wallet,
    currentWallet
  } = common;
  const [info, setInfo] = useState({
    proposal: {},
    organization: {},
    bpList: [],
    parliamentProposerList: [],
    tab: 'proposal',
    loadingStatus: LOADING_STATUS.LOADING
  });
  if (!proposalId) {
    return <Redirect to="/proposals" />;
  }
  useEffect(() => {
    getData(proposalId, wallet, currentWallet, logStatus, dispatch).then(result => {
      setInfo({
        ...info,
        bpList: result.bpList,
        proposal: result.proposal,
        organization: result.organization,
        parliamentProposerList: result.parliamentProposerList,
        loadingStatus: LOADING_STATUS.SUCCESS
      });
    }).catch(e => {
      console.error(e);
      setInfo({
        ...info,
        loadingStatus: LOADING_STATUS.FAILED
      });
    });
  }, [proposalId]);

  const {
    createAt,
    proposer,
    contractAddress,
    contractMethod,
    contractParams,
    expiredTime,
    approvals,
    rejections,
    abstentions,
    status,
    releasedTime,
    proposalType,
    canVote,
    votedStatus,
    createdBy
  } = info.proposal;

  const send = async action => {
    if (proposalType === proposalTypes.REFERENDUM) {
      setVisible(true);
    } else {
      await sendTransaction(wallet, getContractAddress(proposalType), action, proposalId);
    }
  };

  function goBack() {
    history.goBack();
  }

  async function handleApprove() {
    await send('Approve');
  }

  async function handleReject() {
    await send('Reject');
  }

  async function handleAbstain() {
    await send('Abstain');
  }

  async function handleRelease() {
    await send('Release');
  }

  async function handleConfirm(action) {
    if (action) {
      await sendTransaction(wallet, getContractAddress(proposalType), action, proposalId);
    }
    setVisible(false);
  }

  return (
    <div className="proposal-detail">
      {
        info.loadingStatus === LOADING_STATUS.LOADING
          ? <Skeleton />
          : null
      }
      {
        info.loadingStatus === LOADING_STATUS.SUCCESS
          ? (
            <>
              <PageHeader
                onBack={history.length > 1 ? goBack : null}
                title="Proposal Detail"
                subTitle={<CountDown time={expiredTime} status={status} />}
                tags={votedStatus && votedStatus !== 'none'
                  ? (
                    <Tag color={ACTIONS_COLOR_MAP[votedStatus]}>
                      {ACTIONS_ICON_MAP[votedStatus]}
                      {votedStatus}
                    </Tag>
                  ) : null}
                extra={(
                  <Extra
                    {...info.proposal}
                    currentWallet={currentWallet}
                    logStatus={logStatus}
                    handleRelease={handleRelease}
                  />
              )}
              />
              <Divider className="proposal-detail-header-divider" />
              <Title level={3} ellipsis>Proposal ID: {proposalId}</Title>
              <div className="proposal-detail-tag gap-bottom">
                <Tag color="purple" className="gap-right">{proposalType}</Tag>
                {CONTRACT_TEXT_MAP[contractMethod]
                  ? (<Tag color="purple">{CONTRACT_TEXT_MAP[contractMethod]}</Tag>) : null}
              </div>
              <div className="proposal-detail-desc-list">
                <Row gutter={48}>
                  <Col span={12} className="detail-flex">
                    <span className="sub-title gap-right">Application Submitted:</span>
                    <span className="text-ellipsis">{createAt}</span>
                  </Col>
                  <Col span={12} className="detail-flex">
                    <span className="sub-title gap-right">Proposal Expires:</span>
                    <span className="text-ellipsis">{expiredTime}</span>
                  </Col>
                  <Col span={12} className="detail-flex">
                    <span className="sub-title gap-right">Proposer:</span>
                    <span className="text-ellipsis">
                      <a
                        href={`${viewer.addressUrl}/${proposer}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`ELF_${proposer}_${viewer.chainId}`}
                      >
                        {`ELF_${proposer}_${viewer.chainId}`}
                      </a>
                    </span>
                  </Col>
                  {
                  status === proposalStatus.RELEASED ? (
                    <Col span={12} className="detail-flex">
                      <span className="sub-title gap-right">Proposal Released:</span>
                      <span className="text-ellipsis">{releasedTime}</span>
                    </Col>
                  ) : null
                }
                </Row>
              </div>
              <Divider />
              <Tabs type="card">
                <TabPane tab="Proposal Details" key="proposal">
                  <>
                    <VoteData
                      className="gap-top-large"
                      proposalType={proposalType}
                      expiredTime={expiredTime}
                      status={status}
                      approvals={approvals}
                      rejections={rejections}
                      abstentions={abstentions}
                      canVote={canVote}
                      votedStatus={votedStatus}
                      bpCount={info.bpList.length}
                      handleApprove={handleApprove}
                      handleReject={handleReject}
                      handleAbstain={handleAbstain}
                      organization={info.organization}
                    />
                    <OrganizationCard
                      className="gap-top-large"
                      bpList={info.bpList}
                      parliamentProposerList={info.parliamentProposerList}
                      {...info.organization}
                    />
                    <ContractDetail
                      className="gap-top-large"
                      aelf={aelf}
                      contractAddress={contractAddress}
                      contractMethod={contractMethod}
                      contractParams={contractParams}
                      createdBy={createdBy}
                    />
                  </>
                </TabPane>
                <TabPane tab="Voting Details" key="vote">
                  <VoteDetail
                    proposalType={proposalType}
                    proposalId={proposalId}
                    logStatus={logStatus}
                    expiredTime={expiredTime}
                    status={status}
                    currentWallet={currentWallet}
                    wallet={wallet}
                    symbol={info.organization.leftOrgInfo.tokenSymbol || 'ELF'}
                  />
                </TabPane>
              </Tabs>
              {
                visible ? (
                  <ApproveTokenModal
                    aelf={aelf}
                    proposalType={proposalType}
                    {...info.proposal}
                    onCancel={handleConfirm}
                    onConfirm={handleConfirm}
                    wallet={wallet}
                  />
                ) : null
              }
            </>
          ) : null
      }
      {
        info.loadingStatus === LOADING_STATUS.FAILED ? (
          <Result
            status="error"
            title="Error Happened"
            subTitle="Please check your network"
          />
        ) : null
      }
    </div>
  );
};

export default ProposalDetail;
