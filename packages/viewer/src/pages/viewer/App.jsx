/**
 * @file App
 * @author
 */
import React from 'react';
import {
  Layout
} from 'antd';
import Reader from './containers/Reader';
import {
  GlobalContext
} from './common/context';
import { detectMobileBrowser } from './common/utils';
import './index.less';

const {
  Content
} = Layout;

const isMobile = detectMobileBrowser();
const config = {
  isMobile
};

const App = () => (
  <GlobalContext.Provider value={config}>
    <Layout>
      <Content>
        <Reader />
      </Content>
    </Layout>
  </GlobalContext.Provider>
);

export default App;
