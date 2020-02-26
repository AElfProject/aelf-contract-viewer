/**
 * @file desc list
 * @author atom-yang
 */
import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Card,
  Row,
  Col
} from 'antd';
import {
  getOrganizationLeftInfo,
  getCircleValues
} from '../../OrganizationList/Organization';
import constants, {
  organizationInfoPropTypes
} from '../../../common/constants';

const {
  proposalActions
} = constants;

const OrganizationCard = props => {
  const {
    proposalType,
    releaseThreshold,
    leftOrgInfo,
    orgAddress,
    bpList,
    parliamentProposerList,
    className
  } = props;
  const thresholdValue = useMemo(() => getCircleValues(proposalType, releaseThreshold, leftOrgInfo, bpList.length), [
    proposalType,
    releaseThreshold,
    leftOrgInfo,
    bpList
  ]);
  const leftInfo = useMemo(() => getOrganizationLeftInfo(proposalType, leftOrgInfo, bpList, parliamentProposerList), [
    proposalType,
    leftOrgInfo,
    bpList,
    parliamentProposerList
  ]);
  return (
    <Card
      className={className}
      title="Organization Info"
    >
      <div className="gap-bottom-large">
        <span className="sub-title">
          Address:
        </span>
        <span>{orgAddress}</span>
      </div>
      <Row gutter={16}>
        <Col span={12}>
          <>
            <div className="gap-bottom-small">
              <span className="sub-title gap-right-small">
                Minimal Approval Threshold:
              </span>
              <span>
                {thresholdValue[proposalActions.APPROVE].num}
                ({thresholdValue[proposalActions.APPROVE].rate})
              </span>
            </div>
            <div className="gap-bottom-small">
              <span className="sub-title gap-right-small">
                Maximal Rejection Threshold:
              </span>
              <span>
                {thresholdValue[proposalActions.REJECT].num}
                ({thresholdValue[proposalActions.REJECT].rate})
              </span>
            </div>
            <div className="gap-bottom-small">
              <span className="sub-title gap-right-small">
                Maximal Rejection Threshold:
              </span>
              <span>
                {thresholdValue[proposalActions.ABSTAIN].num}
                ({thresholdValue[proposalActions.ABSTAIN].rate})
              </span>
            </div>
            <div className="gap-bottom-small">
              <span className="sub-title gap-right-small">
                Minimal Vote Threshold:
              </span>
              <span>
                {thresholdValue.Total.num}
                ({thresholdValue.Total.rate})
              </span>
            </div>
          </>
        </Col>
        <Col span={12}>
          {leftInfo}
        </Col>
      </Row>
    </Card>
  );
};

OrganizationCard.propTypes = {
  ...organizationInfoPropTypes,
  bpList: PropTypes.arrayOf(PropTypes.string).isRequired,
  parliamentProposerList: PropTypes.arrayOf(PropTypes.string).isRequired
};

export default OrganizationCard;
