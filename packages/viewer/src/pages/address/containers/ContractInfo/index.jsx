/**
 * @file App
 * @author
 */
import React, { useEffect, useState } from 'react';
import Decimal from 'decimal.js';
import {
  Layout,
  Tabs,
  Typography
} from 'antd';
import { useLocation } from 'react-router-dom';
import Reader from './Reader';
import {
  GlobalContext
} from '../../common/context';
import { detectMobileBrowser, useSearchParams } from '../../common/utils';
import TransactionList from '../../components/TransactionList';
import DetailHeader from '../../../../components/DetailHeader';
import TokenList from '../../components/TokenList';
import config from '../../../../common/config';
import {
  getBalances,
  getContractDividend,
  getTokenList,
  sendHeight
} from '../../../../common/utils';
import Dividends from '../../components/Dividends';
import '../../../../common/index.less';
import './index.less';
import Bread from '../../components/Bread';

const { Paragraph } = Typography;
const {
  Content
} = Layout;

const isMobile = detectMobileBrowser();
const context = {
  isMobile
};

async function getHeaderColumns(address) {
  const [balances, dividends, tokens] = await Promise.all([
    getBalances(address),
    getContractDividend(address),
    getTokenList()
  ]);
  Object.keys(dividends || {}).forEach(key => {
    dividends[key] = new Decimal(dividends[key]).dividedBy(`1e${(tokens[key] || {}).decimals || 8}`).toString();
  });
  let elfBalances = balances.filter(v => v.symbol === 'ELF');
  const balancesWithoutELF = balances.filter(v => v.symbol !== 'ELF').sort((a, b) => b.balance - a.balance);
  elfBalances = elfBalances.length === 0 ? 0 : elfBalances[0].balance;
  return [
    {
      tip: 'Contract Address',
      name: 'Address',
      desc: (<Paragraph copyable>{`ELF_${address}_${config.viewer.chainId}`}</Paragraph>)
    },
    {
      tip: 'ELF Balance',
      name: 'Balance',
      desc: `${elfBalances} ELF`
    },
    {
      tip: 'Contract Dividends',
      name: 'Dividends',
      desc: (
        <Dividends dividends={dividends} />
      )
    },
    {
      tip: 'Tokens owned',
      name: 'Tokens',
      desc: (
        <TokenList balances={balancesWithoutELF} />
      )
    }
  ];
}

const {
  TabPane
} = Tabs;

const ContractInfo = () => {
  const { search } = useLocation();
  const address = useSearchParams(search, 'address');
  const [columns, setColumns] = useState([]);
  useEffect(() => {
    getHeaderColumns(address).then(res => {
      sendHeight(700);
      setColumns(res);
    }).catch(e => {
      sendHeight(700);
      console.error(e);
    });
  }, [address]);
  return (
    <GlobalContext.Provider value={context}>
      <Layout>
        <Content>
          <div className="contract-viewer">
            <Bread title="Contract" subTitle={`ELF_${address}_${config.viewer.chainId}`} />
            <DetailHeader columns={columns} />
            <Tabs>
              <TabPane tab="Transaction" key="transaction">
                <TransactionList
                  api={config.API_PATH.GET_TRANSACTION_BY_ADDRESS}
                  owner={address}
                />
              </TabPane>
              <TabPane tab="Contract" key="contract">
                <Reader />
              </TabPane>
            </Tabs>
          </div>
        </Content>
      </Layout>
    </GlobalContext.Provider>
  );
};

export default React.memo(ContractInfo);
