/**
 * @file account info
 * @author
 */
import React, { useEffect, useState, useContext } from 'react';
import {
  Layout,
  Tabs,
  Typography
} from 'antd';
import {
  useParams,
  useHistory
} from 'react-router-dom';
import OldTransactionList from '../../components/OldTransactionList';
import DetailHeader from '../../../../components/DetailHeader';
import TokenList from '../../components/TokenList';
import config from '../../../../common/config';
import {
  getBalances,
  sendHeight
} from '../../../../common/utils';
import '../../../../common/index.less';
import Bread from '../../components/Bread';
import { Contracts } from '../../common/context';
import TransferList from '../../components/TransferList';

const { Paragraph } = Typography;
const {
  Content
} = Layout;

async function getHeaderColumns(address, symbol) {
  const balances = await getBalances(address);
  let elfBalances = balances.filter(v => v.symbol === symbol);
  const balancesWithoutELF = balances.filter(v => v.symbol !== symbol).sort((a, b) => b.balance - a.balance);
  elfBalances = elfBalances.length === 0 ? 0 : elfBalances[0].balance;
  return [
    {
      tip: 'Account Address',
      name: 'Account',
      desc: (<Paragraph copyable>{`ELF_${address}_${config.viewer.chainId}`}</Paragraph>)
    },
    {
      tip: `${symbol} Balance`,
      name: 'Balance',
      desc: `${elfBalances} ${symbol}`
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

const AccountInfo = () => {
  const routerParams = useParams();
  const { symbol = 'ELF', address } = routerParams;
  const [columns, setColumns] = useState([]);
  const history = useHistory();
  const contracts = useContext(Contracts);
  useEffect(() => {
    if (contracts[address]) {
      history.replace(`/contract/${address}`);
    }
  }, [contracts]);
  useEffect(() => {
    getHeaderColumns(address, symbol).then(res => {
      setColumns(res);
      sendHeight(500);
    }).catch(e => {
      sendHeight(500);
      console.error(e);
    });
  }, [address, symbol]);
  return (
    <Layout>
      <Content>
        <div className="main-container">
          <Bread title="Account" subTitle={`ELF_${address}_${config.viewer.chainId}`} />
          <DetailHeader columns={columns} />
          <Tabs>
            <TabPane tab="Transactions" key="transactions">
              <OldTransactionList
                owner={address}
                api={config.API_PATH.GET_TRANSACTION_BY_ADDRESS}
              />
            </TabPane>
            <TabPane tab="Transfers" key="transfers">
              <TransferList owner={address} api={config.API_PATH.GET_TRANSFER_LIST} />
            </TabPane>
          </Tabs>
        </div>
      </Content>
    </Layout>
  );
};

export default React.memo(AccountInfo);
