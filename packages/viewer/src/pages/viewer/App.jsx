/**
 * @file App
 * @author
 */
import React from 'react';
import {
  Layout
} from 'antd';
import Reader from './containers/Reader';

import './index.less';

const {
  Content
} = Layout;

const App = () => (
  <Layout>
    <Content>
      <Reader />
    </Content>
  </Layout>
);

export default App;
