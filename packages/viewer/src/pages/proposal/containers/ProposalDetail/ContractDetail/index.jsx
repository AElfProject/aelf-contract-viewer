/**
 * @file desc list
 * @author atom-yang
 */
import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { If, Then } from 'react-if';
import {
  Card,
  Divider,
  Icon,
  Tooltip,
  Row,
  Col,
  Tag,
  message
} from 'antd';
import {
  API_PATH
} from '../../../common/constants';
import {
  request
} from '../../../../../common/request';
import config from '../../../../../common/config';
import {
  getContract,
  base64ToHex
} from '../../../common/utils';

const {
  viewer
} = config;

function getContractName(address) {
  return request(API_PATH.GET_CONTRACT_NAME, {
    address,
  }, { method: 'GET' });
}

const ContractDetail = props => {
  const {
    aelf,
    contractAddress,
    contractMethod,
    contractParams,
    createdBy,
    ...rest
  } = props;
  const [name, setName] = useState('');
  const [params, setParams] = useState(contractParams);
  useEffect(() => {
    getContractName(contractAddress).then(data => {
      setName(data.name);
    }).catch(() => {
      setName('');
    });
    if (createdBy === 'SYSTEM_CONTRACT') {
      setParams(JSON.stringify(JSON.parse(contractParams), null, 2));
    } else if (contractParams) {
      getContract(aelf, contractAddress).then(contract => {
        const decoded = contract[contractMethod].unpackPackedInput(base64ToHex(contractParams));
        setParams(JSON.stringify(decoded, null, 2));
      }).catch(e => {
        message.error(e.message || 'Chain server is not reachable');
      });
    } else {
      setParams(JSON.stringify(null, null, 2));
    }
  }, [contractAddress]);


  return (
    <Card
      {...rest}
      title={
        (
          <span>
            Contract Details
            <Tooltip title="Specific information about the contract invoked by the proposal">
              <Icon
                className="gap-left main-color"
                type="question-circle-o"
              />
            </Tooltip>
          </span>
        )
      }
    >
      <Row>
        <If condition={!!name}>
          <Then>
            <>
              <Row>
                <Col span={4}>
                  <span className="sub-title">Contract Name</span>
                </Col>
                <Col span={20}>{name}</Col>
              </Row>
              <Divider />
            </>
          </Then>
        </If>
        <Row>
          <Col span={4}>
            <span className="sub-title">Contract Address</span>
          </Col>
          <Col span={20}>
            <a
              href={`${viewer.addressUrl}/${contractAddress}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {`ELF_${contractAddress}_${viewer.chainId}`}
            </a>
          </Col>
        </Row>
        <Divider />
        <Row>
          <Col span={4}>
            <span className="sub-title">Contract Method Name</span>
          </Col>
          <Col span={20}>
            <Tag color="purple">{contractMethod}</Tag>
          </Col>
        </Row>
        <Divider />
        <Row>
          <Col span={4}>
            <span className="sub-title">Contract Params</span>
          </Col>
          <Col span={20}>
            <pre className="view-params">
              {params}
            </pre>
          </Col>
        </Row>
      </Row>
    </Card>
  );
};

ContractDetail.propTypes = {
  aelf: PropTypes.shape({
    chain: PropTypes.object
  }).isRequired,
  contractAddress: PropTypes.string.isRequired,
  contractMethod: PropTypes.string.isRequired,
  contractParams: PropTypes.string.isRequired,
  createdBy: PropTypes.oneOf(['USER', 'SYSTEM_CONTRACT']).isRequired,
};

export default ContractDetail;
