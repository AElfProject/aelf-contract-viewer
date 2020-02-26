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
import { Provider } from 'react-redux';
import App from './App';
import { store } from './store';
import '../../common/index.less';
import './index.less';

moment.locale('en-us');

render(
  <Provider store={store}>
    <ConfigProvider locale={enUS}>
      <HashRouter>
        <App />
      </HashRouter>
    </ConfigProvider>
  </Provider>,
  document.getElementById('app')
);
