/**
 * @file list item
 * @author atom-yang
 */
import React from 'react';
import moment from 'moment';
import PropTypes from 'prop-types';
import {
  Descriptions
} from 'antd';

const DescriptionsItem = Descriptions.Item;

const ListItem = props => {
  const {
    address,
    author,
    updateTime,
    isSystemContract,
    serial
  } = props;
  return (
    <a href={`./contract-viewer.html?address=${address}`}>
      <Descriptions title="Contract info">
        <DescriptionsItem label="address">{address}</DescriptionsItem>
        <DescriptionsItem label="author">{author}</DescriptionsItem>
        <DescriptionsItem label="is system contract">{isSystemContract ? 'true' : 'false'}</DescriptionsItem>
        <DescriptionsItem label="serial number">{serial}</DescriptionsItem>
        <DescriptionsItem label="last updated at">{moment(updateTime).format('YYYY/MM/DD HH:mm:ss')}</DescriptionsItem>
      </Descriptions>
    </a>
  );
};

ListItem.propTypes = {
  address: PropTypes.string.isRequired,
  author: PropTypes.string.isRequired,
  updateTime: PropTypes.string.isRequired,
  isSystemContract: PropTypes.bool.isRequired,
  serial: PropTypes.string.isRequired
};

export default ListItem;
