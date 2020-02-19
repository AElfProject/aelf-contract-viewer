/**
 * @file entry point
 * @author atom-yang
 */
import React from 'react';
import { render } from 'react-dom';
import App from './App';
import '../../common/index.less';

render(
  <App />,
  document.getElementById('app')
);
