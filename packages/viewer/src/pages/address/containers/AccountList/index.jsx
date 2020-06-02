/**
 * @file account list
 * @author atom-yang
 */
import React, { useEffect } from 'react';
import { useLocation } from 'react-use';
import {
  sendMessage,
} from '../../../../common/utils';
import Bread from '../../components/Bread';
import HolderList from '../../components/HolderList';

const AccountList = () => {
  const fullPath = useLocation();
  useEffect(() => {
    sendMessage({
      href: fullPath.href
    });
  }, [fullPath]);

  return (
    <div className="account-list main-container">
      <Bread title="Account List" />
      <HolderList symbol="ELF" />
    </div>
  );
};

export default React.memo(AccountList);
