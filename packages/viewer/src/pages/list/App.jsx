/**
 * @file App
 * @author
 */
import React from 'react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/lib/locale/zh_CN';
import List from './containers/List';

const App = () => (
  <ConfigProvider locale={zhCN}>
    <List />
  </ConfigProvider>
);

export default App;
