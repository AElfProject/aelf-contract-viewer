/**
 * @file header
 * @author atom-yang
 */
import React from 'react';
import PropTypes from 'prop-types';
import {
  Tag,
  Divider
} from 'antd';
import {
  LinkIcon
} from '../../common/Icon';
import config from '../../../../common/config';
import './index.less';

const Header = props => {
  const {
    address,
    author,
    isSystemContract
  } = props;
  return (
    <div className="contract-viewer-header">
      <h2>
        <a
          href={`${config.viewer.addressUrl}/${address}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {address}
          <LinkIcon />
        </a>
      </h2>
      <Divider />
      <div className="contract-viewer-header-desc">
        <div className="contract-viewer-header-desc-item">
          <div className="gap-right">Author:</div>
          <div>
            <a
              href={`${config.viewer.addressUrl}/${author}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {address}
              <LinkIcon />
            </a>
          </div>
        </div>
        <div className="contract-viewer-header-desc-item">
          <div className="gap-right">Contract Type:</div>
          <Tag color={isSystemContract ? 'green' : 'blue'}>{isSystemContract ? 'System' : 'User'}</Tag>
        </div>
      </div>
    </div>
  );
};

Header.propTypes = {
  address: PropTypes.string.isRequired,
  author: PropTypes.string.isRequired,
  isSystemContract: PropTypes.bool.isRequired
};

export default Header;
