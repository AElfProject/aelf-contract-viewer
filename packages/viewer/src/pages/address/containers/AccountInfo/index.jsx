/**
 * @file account info
 * @author
 */
import React, { useEffect, useState } from 'react';
import {
  Layout,
  Tabs,
  Typography
} from 'antd';
import { useParams } from 'react-router-dom';
import TransactionList from '../../components/TransactionList';
import DetailHeader from '../../../../components/DetailHeader';
import TokenList from '../../components/TokenList';
import config from '../../../../common/config';
import {
  getBalances,
  sendHeight
} from '../../../../common/utils';
import '../../../../common/index.less';
import Bread from '../../components/Bread';

const { Paragraph } = Typography;
const {
  Content
} = Layout;

async function getHeaderColumns(address) {
  const balances = await getBalances(address);
  let elfBalances = balances.filter(v => v.symbol === 'ELF');
  const balancesWithoutELF = balances.filter(v => v.symbol !== 'ELF').sort((a, b) => b.balance - a.balance);
  elfBalances = elfBalances.length === 0 ? 0 : elfBalances[0].balance;
  return [
    {
      tip: 'Account Address',
      name: 'Account',
      desc: (<Paragraph copyable>{`ELF_${address}_${config.viewer.chainId}`}</Paragraph>)
    },
    {
      tip: 'ELF Balance',
      name: 'Balance',
      desc: `${elfBalances} ELF`
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
  const { address } = useParams();
  const [columns, setColumns] = useState([]);
  useEffect(() => {
    getHeaderColumns(address).then(res => {
      setColumns(res);
      sendHeight(500);
    }).catch(e => {
      sendHeight(500);
      console.error(e);
    });
  }, [address]);
  return (
    <Layout>
      <Content>
        <div className="main-container">
          <Bread title="Account" subTitle={`ELF_${address}_${config.viewer.chainId}`} />
          <DetailHeader columns={columns} />
          <Tabs>
            <TabPane tab="Transaction" key="transaction">
              <TransactionList
                api={config.API_PATH.GET_TRANSACTION_BY_ADDRESS}
                owner={address}
              />
            </TabPane>
          </Tabs>
        </div>
      </Content>
    </Layout>
  );
};

export default React.memo(AccountInfo);
