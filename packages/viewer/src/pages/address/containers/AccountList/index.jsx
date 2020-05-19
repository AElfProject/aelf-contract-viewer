/**
 * @file account list
 * @author atom-yang
 */
import React, { useMemo, useState, useEffect } from 'react';
import {
  message,
  Pagination,
  Table
} from 'antd';
import {
  Link
} from 'react-router-dom';
import { useLocation } from 'react-use';
import { request } from '../../../../common/request';
import config from '../../../../common/config';
import Total from '../../../../components/Total';
import {
  sendHeight,
  sendMessage,
} from '../../../../common/utils';
import Bread from '../../components/Bread';

function getListColumn(preTotal) {
  return [
    {
      title: 'Rank',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render(id, record, index) {
        return preTotal + index + 1;
      }
    },
    {
      title: 'Address',
      dataIndex: 'owner',
      key: 'owner',
      ellipsis: true,
      render: address => (
        <Link
          to={`/address/${address}`}
          title={`ELF_${address}_${config.viewer.chainId}`}
        >
          {`ELF_${address}_${config.viewer.chainId}`}
        </Link>
      )
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      key: 'balance',
      render(balance, record) {
        return `${balance} ${record.symbol}`;
      }
    },
    {
      title: 'Percentage',
      dataIndex: 'percentage',
      key: 'percentage'
    },
    {
      title: 'Transfers',
      dataIndex: 'count',
      key: 'count'
    }
  ];
}

const fetchingStatusMap = {
  FETCHING: 'fetching',
  ERROR: 'error',
  SUCCESS: 'success'
};

const AccountList = () => {
  const fullPath = useLocation();
  useEffect(() => {
    sendMessage({
      href: fullPath.href
    });
  }, [fullPath]);
  const [list, setList] = useState([]);
  const [fetchingStatus, setFetchingStatus] = useState(fetchingStatusMap.FETCHING);
  const [pagination, setPagination] = useState({
    total: 0,
    pageSize: 10,
    pageNum: 1
  });
  const columns = useMemo(() => getListColumn(pagination.pageSize * (pagination.pageNum - 1)), [
    pagination
  ]);

  const getList = pager => {
    setFetchingStatus(fetchingStatusMap.FETCHING);
    request(config.API_PATH.GET_ACCOUNT_LIST, {
      ...pager,
      symbol: 'ELF'
    }, {
      method: 'GET'
    }).then(result => {
      setFetchingStatus(fetchingStatusMap.SUCCESS);
      const {
        list: resultList,
        total
      } = result;
      setList(resultList);
      setPagination({
        ...pager,
        total
      });
      sendHeight(500);
    }).catch(e => {
      sendHeight(500);
      setFetchingStatus(fetchingStatusMap.ERROR);
      console.error(e);
      message.error('Network error');
    });
  };

  useEffect(() => {
    getList(pagination);
  }, []);

  const onPageNumChange = (page, pageSize) => {
    const newPagination = {
      ...pagination,
      pageNum: page,
      pageSize
    };
    getList(newPagination);
  };

  return (
    <div className="account-list main-container">
      <Bread title="Account List" />
      <div className="account-list-content">
        <Table
          dataSource={list}
          columns={columns}
          loading={fetchingStatus === fetchingStatusMap.FETCHING}
          rowKey="owner"
          pagination={false}
        />
      </div>
      <div className="account-list-pagination gap-top float-right">
        <Pagination
          showQuickJumper
          total={pagination.total}
          current={pagination.pageNum}
          pageSize={pagination.pageSize}
          hideOnSinglePage
          showSizeChanger={false}
          onChange={onPageNumChange}
          showTotal={Total}
        />
      </div>
    </div>
  );
};

export default React.memo(AccountList);
