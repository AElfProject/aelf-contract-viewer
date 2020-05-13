/**
 * @file App container
 * @author atom-yang
 */
import React, { useEffect } from 'react';
import {
  Switch,
  Redirect,
  Route
} from 'react-router-dom';
import useLocation from 'react-use/lib/useLocation';
import ContractInfo from './containers/ContractInfo';
import ContractList from './containers/ContractList';
import AccountList from './containers/AccountList';
import AccountInfo from './containers/AccountInfo';
import {
  sendMessage
} from '../../common/utils';

const App = () => {
  const fullPath = useLocation();
  useEffect(() => {
    sendMessage({
      href: fullPath.href
    });
  }, [fullPath]);
  return (
    <Switch>
      <Route exact path="/address">
        <AccountList />
      </Route>
      <Route path="/address/:address">
        <AccountInfo />
      </Route>
      <Route exact path="/contract">
        <ContractList />
      </Route>
      <Route path="/contract/info">
        <ContractInfo />
      </Route>
      <Redirect to="/address" />
    </Switch>
  );
};

export default App;
