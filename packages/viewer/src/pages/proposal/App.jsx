/**
 * @file App container
 * @author atom-yang
 */
import React, { useEffect, useState } from 'react';
import {
  useHistory,
  Switch,
  Redirect,
  Route,
  useLocation
} from 'react-router-dom';
import useUseLocation from 'react-use/lib/useLocation';
import {
  useSelector,
  useDispatch
} from 'react-redux';
import {
  Tabs,
  Popover,
  Icon
} from 'antd';
import {
  logIn,
  LOG_IN_ACTIONS
} from './actions/common';
import LogButton from './components/Log';
import {
  LOG_STATUS
} from './common/constants';
import walletInstance from './common/wallet';
import Plugin from '../../components/plugin';
import ProposalList from './containers/ProposalList';
import OrganizationList from './containers/OrganizationList';
import CreateProposal from './containers/CreateProposal';
import CreateOrganization from './containers/CreateOrganization';
import ProposalDetail from './containers/ProposalDetail';
import Rules from './components/Rules';
import {
  innerHeight,
  sendMessage
} from '../../common/utils';

const { TabPane } = Tabs;

const ROUTES_TABS = [
  'proposals',
  'organizations',
  'apply'
];

function useRouteMatch(path) {
  const pathKey = path.replace(/\//, '').toLowerCase();
  try {
    return ROUTES_TABS.filter(v => pathKey.indexOf(v.toLowerCase()) > -1)[0] || 'proposals';
  } catch (e) {
    return 'proposals';
  }
}

const App = () => {
  const dispatch = useDispatch();
  const history = useHistory();
  const logStatus = useSelector(state => state.common.logStatus);
  const [isExist, setIsExist] = useState(true);
  const location = useLocation();
  console.log(location);
  const {
    pathname
  } = location;
  const tabKey = useRouteMatch(pathname);
  const fullPath = useUseLocation();
  useEffect(() => {
    sendMessage({
      href: fullPath.href
    });
    innerHeight().then(height => {
      sendMessage({ height });
    }).catch(err => {
      console.error(err);
    });
  }, [fullPath]);

  useEffect(() => {
    walletInstance.isExist.then(result => {
      setIsExist(result);
      if (result === true) {
        dispatch(logIn());
      } else {
        dispatch({
          type: LOG_IN_ACTIONS.LOG_IN_FAILED,
          payload: {}
        });
      }
    }).catch(() => {
      setIsExist(false);
    });
  }, []);
  const handleTabChange = key => {
    history.push(`/${key}`);
  };
  return (
    <div className="proposal">
      {
        isExist ? null : <Plugin />
      }
      <Tabs
        defaultActiveKey={tabKey}
        activeKey={tabKey}
        onChange={handleTabChange}
        tabBarExtraContent={(
          <>
            <Popover
              content={<Rules />}
              placement="bottom"
            >
              <span className="gap-right-small">
                <Icon type="exclamation-circle" className="gap-right-small main-color" />
                Proposal Rules
              </span>
            </Popover>
            <LogButton isExist={!!isExist} />
          </>
        )}
      >
        <TabPane tab="Proposals" key="proposals" />
        {logStatus === LOG_STATUS.LOGGED
          ? <TabPane tab="Apply" key="apply" /> : null}
        <TabPane tab="Organizations" key="organizations" />
      </Tabs>
      <div className="proposal-container">
        <Switch>
          <Route path="/proposalsDetail/:proposalId">
            <ProposalDetail />
          </Route>
          <Route path="/proposals">
            <ProposalList />
          </Route>
          <Route path="/organizations">
            <OrganizationList />
          </Route>
          <Route path="/apply/:orgAddress">
            {
              logStatus === LOG_STATUS.LOGGED
                ? <CreateProposal /> : <Redirect to="/proposals" />
            }
          </Route>
          <Route path="/apply">
            {
              logStatus === LOG_STATUS.LOGGED
                ? <CreateProposal /> : <Redirect to="/proposals" />
            }
          </Route>
          <Route path="/createOrganizations">
            {
              logStatus === LOG_STATUS.LOGGED
                ? <CreateOrganization /> : <Redirect to="/organizations" />
            }
          </Route>
          <Redirect to="/proposals" />
        </Switch>
      </div>
    </div>
  );
};

export default App;
