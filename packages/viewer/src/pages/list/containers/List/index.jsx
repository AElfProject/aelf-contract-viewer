/**
 * @file contract list
 * @author atom-yang
 */
import React, { useState, useEffect } from 'react';
import Search from 'antd/lib/input/Search';
import 'antd/lib/input/style';
import {
  Divider,
  message,
  Pagination,
  Table,
  Tag
} from 'antd';
import { request } from '../../../../common/request';
import { API_PATH } from '../../common/constants';
import config from '../../../../common/config';
import './index.less';
import { innerHeight, sendMessage } from '../../../../common/utils';

const ListColumn = [
  {
    title: '合约地址',
    dataIndex: 'address',
    key: 'address',
    ellipsis: true,
    width: 400,
    render: address => (
      <a href={`${config.viewer.viewerUrl}?address=${address}`}>
        {`${config.viewer.prefix}_${address}_${config.viewer.chainId}`}
      </a>
    )
  },
  {
    title: '合约类型',
    dataIndex: 'isSystemContract',
    key: 'isSystemContract',
    render: isSystemContract => (
      <Tag color={isSystemContract ? 'green' : 'blue'}>{isSystemContract ? '系统' : '用户'}</Tag>
    )
  },
  {
    title: '合约版本',
    dataIndex: 'version',
    key: 'version'
  },
  {
    title: '合约作者',
    dataIndex: 'author',
    key: 'author',
    ellipsis: true,
    width: 400,
    render: address => (
      <a
        href={`${config.viewer.addressUrl}/${address}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {`${config.viewer.prefix}_${address}_${config.viewer.chainId}`}
      </a>
    )
  },
  {
    title: '更新时间',
    dataIndex: 'updateTime',
    key: 'updateTime'
  }
];

const fetchingStatusMap = {
  FETCHING: 'fetching',
  ERROR: 'error',
  SUCCESS: 'success'
};

const Total = total => (
  <span>共<span className="contract-list-total">{total}</span>个</span>
);

const List = () => {
  const [list, setList] = useState([]);
  const [fetchingStatus, setFetchingStatus] = useState(fetchingStatusMap.FETCHING);
  const [pagination, setPagination] = useState({
    total: 0,
    pageSize: 10,
    pageNum: 1
  });

  const getList = pager => {
    setFetchingStatus(fetchingStatusMap.FETCHING);
    request(API_PATH.GET_LIST, pager, {
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
    }).catch(e => {
      setFetchingStatus(fetchingStatusMap.ERROR);
      console.error(e);
      message.error('网络错误');
    });
  };

  useEffect(() => {
    innerHeight().then(height => {
      sendMessage({ height });
    }).catch(err => {
      console.error(err);
    });
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

  const onSearch = value => {
    const newPagination = {
      ...pagination,
      pageNum: 1,
      address: value
    };
    getList(newPagination);
  };

  return (
    <div className="contract-list">
      <div className="contract-list-search">
        <h2>&nbsp;</h2>
        <Search
          className="contract-list-search-input"
          placeholder="输入合约地址"
          size="large"
          onSearch={onSearch}
        />
      </div>
      <Divider />
      <div className="contract-list-content">
        <Table
          dataSource={list}
          columns={ListColumn}
          loading={fetchingStatus === fetchingStatusMap.FETCHING}
          rowKey="address"
          pagination={false}
        />
      </div>
      <div className="contract-list-pagination">
        <Pagination
          showQuickJumper
          total={pagination.total}
          current={pagination.pageNum}
          pageSize={pagination.pageSize}
          hideOnSinglePage
          onChange={onPageNumChange}
          showTotal={Total}
        />
      </div>
    </div>
  );
};

export default List;
