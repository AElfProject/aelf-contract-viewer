/**
 * @file old transaction list from old api
 * @author atom-yang
 */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import moment from 'moment';
import TransactionList from '../TransactionList';
import config from '../../../../common/config';

function getColumns(contractNames, ownerAddress) {
  return [
    {
      title: 'Tx Id',
      dataIndex: 'txId',
      key: 'txId',
      ellipsis: true,
      width: 250,
      render(txId) {
        return (
          <a
            title={txId}
            href={`${config.viewer.txUrl}/${txId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {txId}
          </a>
        );
      }
    },
    {
      title: 'Block Height',
      dataIndex: 'blockHeight',
      key: 'blockHeight',
      render(height) {
        return (
          <a
            href={`${config.viewer.blockUrl}/${height}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {height}
          </a>
        );
      }
    },
    {
      title: 'Method',
      width: 100,
      dataIndex: 'method',
      key: 'method',
      ellipsis: true
    },
    {
      title: 'Event',
      width: 100,
      dataIndex: 'action',
      key: 'action',
      ellipsis: true
    },
    {
      title: 'Symbol',
      width: 50,
      dataIndex: 'symbol',
      key: 'symbol',
      ellipsis: true
    },
    {
      title: 'From',
      dataIndex: 'from',
      key: 'to',
      ellipsis: true,
      render(from) {
        return from === ownerAddress ? from : (
          <Link
            to={`/address/${from}`}
            title={`ELF_${from}_${config.viewer.chainId}`}
          >
            {`ELF_${from}_${config.viewer.chainId}`}
          </Link>
        );
      }
    },
    {
      title: 'To',
      dataIndex: 'addressTo',
      key: 'addressTo',
      ellipsis: true,
      render(to) {
        return to === ownerAddress ? to : (
          <Link
            to={`/address/${to}`}
            title={`ELF_${to}_${config.viewer.chainId}`}
          >
            {`ELF_${to}_${config.viewer.chainId}`}
          </Link>
        );
      }
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      ellipsis: true,
      render(amount, record) {
        return `${amount} ${record.symbol}`;
      }
    },
    {
      title: 'Tx Fee',
      dataIndex: 'txFee',
      key: 'txFee',
      render(fee) {
        return `${fee} ELF`;
      }
    },
    {
      title: 'Time',
      dataIndex: 'time',
      key: 'time',
      width: 160,
      render(time) {
        return moment(time).format('YYYY/MM/DD HH:mm:ss');
      }
    }
  ];
}

const TransferList = props => {
  const {
    owner,
    api
  } = props;
  const freezeParams = useState({
    address: owner
  });
  return (
    <TransactionList
      owner={owner}
      freezeParams={freezeParams}
      api={api}
      getColumns={getColumns}
    />
  );
};

TransferList.propTypes = {
  owner: PropTypes.string.isRequired,
  api: PropTypes.string.isRequired
};

export default React.memo(TransferList);
