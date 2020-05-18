/**
 * @file transaction list
 * @author atom-yang
 */
import React, { useMemo, useState, useEffect } from 'react';
import axios from 'axios';
import moment from 'moment';
import PropTypes from 'prop-types';
import {
  Link
} from 'react-router-dom';
import {
  Table,
  Pagination,
  message
} from 'antd';
import config from '../../../../common/config';
import { getContractNames, removeAElfPrefix, sendHeight } from '../../../../common/utils';
import Total from '../../../../components/Total';

function getTableColumns(contractNames, ownerAddress) {
  return [
    {
      title: 'Tx ID',
      dataIndex: 'tx_id',
      key: 'tx_id',
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
      dataIndex: 'block_height',
      key: 'block_height',
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
      width: 200,
      dataIndex: 'method',
      key: 'method',
      ellipsis: true
    },
    {
      title: 'From',
      dataIndex: 'address_from',
      key: 'address_from',
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
      dataIndex: 'address_to',
      key: 'address_to',
      ellipsis: true,
      render(to) {
        let text = to;
        if (contractNames[to] && contractNames[to].contractName) {
          text = removeAElfPrefix(contractNames[to].contractName);
        }
        return to === ownerAddress ? text : (
          <Link
            to={`/contract/info?address=${to}`}
            title={text}
          >
            {text}
          </Link>
        );
      }
    },
    {
      title: 'Tx Fee',
      dataIndex: 'tx_fee',
      key: 'tx_fee',
      render(fee) {
        return `${fee} ELF`;
      }
    },
    {
      title: 'Time',
      dataIndex: 'time',
      key: 'time',
      render(time) {
        return moment(time).utcOffset(0).format('YYYY/MM/DD HH:mm:ssZ');
      }
    }
  ];
}

function getList(api, params) {
  return axios.get(api, {
    params
  }).then(res => {
    const { data } = res;
    const {
      total = 0,
      transactions = []
    } = data;
    return {
      total,
      list: transactions
    };
  })
    .catch(e => {
      console.error(e);
      return {
        total: 0,
        list: []
      };
    });
}

const TransactionList = props => {
  const {
    api,
    requestParamsFormatter,
    responseFormatter,
    owner
  } = props;
  const [contractNames, setContractNames] = useState({});
  const columns = useMemo(() => getTableColumns(contractNames, owner), [
    contractNames,
    owner
  ]);

  const [result, setResult] = useState({
    list: [],
    total: 0
  });
  const [params, setParams] = useState({
    limit: 10,
    page: 1,
    address: owner,
    loading: false
  });

  function fetch(apiParams) {
    setParams({
      ...params,
      loading: true
    });
    getList(api, requestParamsFormatter({
      ...apiParams,
      page: apiParams.page - 1
    }))
      .then(res => {
        const {
          list,
          total
        } = responseFormatter(res);
        setResult({
          list,
          total
        });
        setParams({
          ...params,
          ...apiParams,
          loading: false
        });
        sendHeight(500);
      })
      .catch(e => {
        sendHeight(500);
        console.error(e);
        message.error('Network error');
      });
  }

  useEffect(() => {
    fetch(params);
    getContractNames().then(res => setContractNames(res));
  }, []);

  async function onPageChange(page, limit) {
    await fetch({
      ...params,
      page,
      limit
    });
  }
  return (
    <div className="transaction-list">
      <Table
        dataSource={result.list}
        columns={columns}
        loading={params.loading}
        rowKey="tx_id"
        pagination={false}
      />
      <Pagination
        className="float-right gap-top"
        showQuickJumper
        total={result.total}
        current={params.page}
        pageSize={params.limit}
        hideOnSinglePage
        showSizeChanger={false}
        onChange={onPageChange}
        showTotal={Total}
      />
    </div>
  );
};

TransactionList.propTypes = {
  api: PropTypes.string.isRequired,
  responseFormatter: PropTypes.func,
  requestParamsFormatter: PropTypes.func,
  owner: PropTypes.string.isRequired
};

TransactionList.defaultProps = {
  requestParamsFormatter: params => ({
    ...params,
    order: 'DESC'
  }),
  responseFormatter: response => response
};

export default TransactionList;
