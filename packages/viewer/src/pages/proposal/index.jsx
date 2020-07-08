/**
 * @file entry
 * @author atom-yang
 */
import { ConfigProvider } from 'antd';
import * as Sentry from '@sentry/react';
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
import config from '../../common/config';

moment.locale('en-us');

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: 'https://c95bdbf7fbe441639c8ef0858b67baf8@o414245.ingest.sentry.io/5303396',
    release: `viewer@${process.env.PACKAGE_VERSION}`
  });
  Sentry.configureScope(scope => {
    scope.setTag('chainId', config.chainId);
    scope.setExtra('chainId', config.chainId);
    scope.setExtra('pages-id', 'proposal');
    scope.setTag('pages-id', 'proposal');
  });
}

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
