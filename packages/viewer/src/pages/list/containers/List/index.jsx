/**
 * @file contract list
 * @author atom-yang
 */
import React, { useState, useEffect } from 'react';
import Search from 'antd/lib/input/Search';
import 'antd/lib/input/style';
import {
  message,
  Pagination
} from 'antd';
import { request } from '../../../../common/request';
import { API_PATH } from '../../common/constants';
import ListItem from '../../components/ListItem';
import './index.less';

const List = () => {
  const [list, setList] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    pageSize: 10,
    pageNum: 1
  });

  const getList = pager => {
    request(API_PATH.GET_LIST, pager, {
      method: 'GET'
    }).then(result => {
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

  const onSearch = value => {
    const newPagination = {
      ...pagination,
      address: value
    };
    getList(newPagination);
  };

  return (
    <div className="contract-list">
      <div className="contract-list-search">
        <Search
          className="contract-list-search-input"
          placeholder="Input contract address"
          enterButton
          onSearch={onSearch}
        />
      </div>
      <div className="contract-list-content">
        {list.map(v => {
          const {
            address,
            author,
            isSystemContract,
            serial,
            updateTime
          } = v;
          return (
            <ListItem
              key={address}
              address={address}
              author={author}
              updateTime={updateTime}
              isSystemContract={isSystemContract}
              serial={serial}
            />
          );
        })}
      </div>
      <div className="contract-list-pagination">
        <Pagination
          total={pagination.total || 0}
          current={pagination.pageNum || 1}
          pageSize={pagination.pageSize || 20}
          hideOnSinglePage
          onChange={onPageNumChange}
          showTotal={total => `Total ${total} items`}
        />
      </div>
    </div>
  );
};

export default List;
