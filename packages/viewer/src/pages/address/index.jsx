/**
 * @file entry
 * @author atom-yang
 */
import { ConfigProvider } from 'antd';
import moment from 'moment';
import enUS from 'antd/lib/locale/en_US';
import { HashRouter } from 'react-router-dom';
import React from 'react';
import { render } from 'react-dom';
import App from './App';
import '../../common/index.less';

moment.locale('en-us');

render(
  <ConfigProvider locale={enUS}>
    <HashRouter>
      <App />
    </HashRouter>
  </ConfigProvider>,
  document.getElementById('app')
);
