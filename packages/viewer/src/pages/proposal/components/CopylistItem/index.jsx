import React from 'react';
import './index.less';
import PropTypes from 'prop-types';
import { Button, message } from 'antd';
import copy from 'copy-to-clipboard';
import IconFont from '../../../../components/IconFont';
import { omitString } from '../../../../common/utils';

const CopylistItem = props => {
  const {
    label, value = '', href
  } = props;
  const handleCopy = () => {
    try {
      copy(value);
      // eslint-disable-next-line no-undef
      message.success('Copied!');
    } catch (e) {
      message.error('Copy failed, please copy by yourself.');
    }
  };
  return !value ? (
    <div>
      <span>
        {label}
      </span>
    </div>
  )
    : (
      <div className="copy-list-item-wrapper">
        <span className="copy-list-label">
          {label}
:
        </span>
        <span className="copy-list-value">
          {omitString(value, 10, 10)}
          <Button type="link" icon={<IconFont type="shareLink" />} href={href} />

          <Button
            onClick={handleCopy}
            type="circle"
            icon={<IconFont type="copy" />}
            title="Copy code"
          />
        </span>

      </div>
    );
};

CopylistItem.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  href: PropTypes.string.isRequired
};

export default CopylistItem;
