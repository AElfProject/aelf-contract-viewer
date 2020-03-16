/**
 * @file vote data
 * @author atom-yang
 */
import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Row,
  Col,
  Button,
  Card
} from 'antd';
import moment from 'moment';
import VoteChart from '../../../components/VoteChart';
import constants, {
  organizationInfoPropTypes
} from '../../../common/constants';

const {
  proposalStatus,
  proposalTypes
} = constants;

const VoteData = props => {
  const {
    proposalType,
    status,
    approvals,
    rejections,
    abstentions,
    canVote,
    votedStatus,
    bpCount,
    handleApprove,
    handleReject,
    handleAbstain,
    expiredTime,
    organization
  } = props;
  const [canThisUserVote, setCanThisVote] = useState(false);
  useEffect(() => {
    let realProposalStatus = status;
    if (status === proposalStatus.APPROVED || status === proposalStatus.PENDING) {
      // eslint-disable-next-line max-len
      realProposalStatus = moment(expiredTime, 'YYYY/MM/DD HH:mm:ssZ').isBefore(moment()) ? proposalStatus.EXPIRED : status;
    }
    setCanThisVote((
      realProposalStatus === proposalStatus.PENDING
      || realProposalStatus === proposalStatus.APPROVED
    ) && votedStatus === 'none' && canVote);
  }, [status, votedStatus, expiredTime]);
  return (
    <Card
      title="Voting Data"
      className="vote-data"
    >
      <Row type="flex">
        <Col span={14}>
          <VoteChart
            proposalType={proposalType}
            approvals={approvals}
            rejections={rejections}
            abstentions={abstentions}
            bpCount={bpCount}
            organizationInfo={organization}
          />
        </Col>
        <Col span={8} offset={2} className="vote-data-button">
          <div>
            <Button
              disabled={!canThisUserVote}
              className="approve-color gap-right"
              shape="round"
              onClick={handleApprove}
            >
              Approve
            </Button>
          </div>
          <div>
            <Button
              className="gap-right-large"
              type="danger"
              shape="round"
              disabled={!canThisUserVote}
              onClick={handleReject}
            >
              &nbsp;Reject&nbsp;&nbsp;
            </Button>
            <Button
              type="link"
              disabled={!canThisUserVote}
              onClick={handleAbstain}
            >
              Abstain
            </Button>
          </div>
        </Col>
      </Row>
    </Card>
  );
};

VoteData.propTypes = {
  proposalType: PropTypes.oneOf(Object.values(proposalTypes)).isRequired,
  expiredTime: PropTypes.string.isRequired,
  status: PropTypes.oneOf(Object.values(proposalStatus)).isRequired,
  approvals: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string
  ]).isRequired,
  rejections: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string
  ]).isRequired,
  abstentions: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string
  ]).isRequired,
  canVote: PropTypes.bool.isRequired,
  votedStatus: PropTypes.oneOf([
    'none',
    'Approve',
    'Reject',
    'Abstain'
  ]).isRequired,
  bpCount: PropTypes.number.isRequired,
  handleApprove: PropTypes.func.isRequired,
  handleReject: PropTypes.func.isRequired,
  handleAbstain: PropTypes.func.isRequired,
  organization: PropTypes.shape(organizationInfoPropTypes).isRequired,
};

export default VoteData;
