/**
 * @file create proposal
 * @author atom-yang
 */
import React, { useCallback, useState } from 'react';
import {
  Tabs,
  Modal,
  message,
  Button
} from 'antd';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { request } from '../../../../common/request';
import {
  API_PATH
} from '../../common/constants';
import {
  getOriginProposedContractInputHash
} from '../../common/util.proposed';
import NormalProposal from './NormalProposal';
import ContractProposal, { contractMethodType } from './ContractProposal';
import './index.less';
import {
  formatTimeToNano,
  getContractAddress,
  getSignParams,
  getTxResult,
  showTransactionResult,
  uint8ToBase64
} from '../../common/utils';
import { deserializeLog } from '../../../../common/utils';
import CopylistItem from '../../components/CopylistItem';

const {
  TabPane
} = Tabs;

function getCsrfToken() {
  return document.cookie.replace(/(?:(?:^|.*;\s*)csrfToken\s*\=\s*([^;]*).*$)|^.*$/, '$1');
}

async function updateContractName(wallet, currentWallet, params) {
  const signedParams = await getSignParams(wallet, currentWallet);
  if (Object.keys(signedParams).length > 0) {
    return request(API_PATH.UPDATE_CONTRACT_NAME, {
      ...params,
      ...signedParams,
    }, {
      headers: {
        'x-csrf-token': getCsrfToken()
      }
    });
  }
  throw new Error('get signature failed');
}

async function addContractName(wallet, currentWallet, params) {
  const signedParams = await getSignParams(wallet, currentWallet);
  if (Object.keys(signedParams).length > 0) {
    return request(API_PATH.ADD_CONTRACT_NAME, {
      ...params,
      ...signedParams,
    }, {
      headers: {
        'x-csrf-token': getCsrfToken()
      }
    });
  }
  throw new Error('get signature failed');
}

async function getDeserializeLog(aelf, txId, logName = 'ProposalCreated') {
  if (!txId) throw new Error('get not get txId');
  const txResult = await getTxResult(aelf, txId ?? '');
  if (txResult.Status === 'MINED') {
    const {
      Logs = []
    } = txResult;
    const log = (Logs || []).filter(v => v.Name === logName);
    if (log.length === 0) {
      return;
    }
    const result = await deserializeLog(log[0], log[0].Name, log[0].Address);
    // eslint-disable-next-line consistent-return
    return result;
  }
}

const initApplyModal = {
  visible: false,
  title: '',
  children: ''
};

const CreateProposal = () => {
  const { orgAddress = '' } = useParams();
  const modifyData = useSelector(state => state.proposalModify);
  const common = useSelector(state => state.common);
  const proposalSelect = useSelector(state => state.proposalSelect);
  const [normalResult, setNormalResult] = useState({
    isModalVisible: false,
    confirming: false
  });
  const [contractResult, setContractResult] = useState({
    confirming: false
  });
  const {
    aelf,
    wallet,
    currentWallet
  } = common;
  const [applyModal, setApplyModal] = useState(initApplyModal);

  function handleCancel() {
    if (normalResult.isModalVisible) {
      setNormalResult({
        ...normalResult,
        isModalVisible: false,
        confirming: false
      });
    }
    if (contractResult.isModalVisible) {
      setContractResult({
        ...contractResult,
        confirming: false
      });
    }
  }

  function handleNormalSubmit(results) {
    setNormalResult({
      ...normalResult,
      ...results,
      isModalVisible: true,
      confirming: false
    });
  }

  // eslint-disable-next-line no-return-await
  const contractSend = useCallback(async (action, params, isOriginResult) => {
    const result = await wallet.invoke({
      contractAddress: getContractAddress('Genesis'),
      param: params,
      contractMethod: action
    });
    if (isOriginResult) return result;
    if (result && +result.error === 0 || !result.error) {
      return result;
    }
    throw new Error((result.errorMessage || {}).message || 'Send transaction failed');
  }, [wallet]);

  const ReleaseApprovedContractAction = useCallback(async contract => {
    const { contractMethod, proposalId } = contract;
    const proposalItem = proposalSelect.list.find(item => item.proposalId === proposalId);
    if (!proposalItem) throw new Error('Please check if the proposalId is valid');
    const res = await getDeserializeLog(aelf, proposalItem.createTxId, 'ContractProposed');
    const { proposedContractInputHash } = res ?? {};
    if (!proposedContractInputHash) throw new Error('Please check if the proposalId is valid');
    const param = {
      proposalId,
      proposedContractInputHash
    };
    const result = await contractSend(contractMethod, param, true);
    let isError = false;
    if (!(result && +result.error === 0 || !result.error)) {
      isError = true;
      throw new Error((result.errorMessage || {}).message || 'Send transaction failed');
    }
    const Log = await getDeserializeLog(aelf, result?.TransactionId || result?.result?.TransactionId || '');
    const { proposalId: newProposalId } = Log ?? '';
    setApplyModal({
      visible: true,
      title: !isError ? 'Proposal is created！' : 'Proposal failed to be created！',
      children: (
        <>
          {!isError && newProposalId
            ? (
              <CopylistItem
                label="Proposal ID："
                value={newProposalId ?? ''}
                href={`/proposalsDetail/${newProposalId}`}
              />
            ) : 'This may be due to the failure in transaction which can be viewed via Transaction ID:'}
          <CopylistItem
            label="Transaction ID："
            value={result?.TransactionId || result?.result?.TransactionId || ''}
            href={`/tx/${result?.TransactionId || result?.result?.TransactionId || ''}`}
          />
        </>)
    });
  }, [proposalSelect]);

  const ReleaseCodeCheckedContractAction = useCallback(async contract => {
    const { contractMethod, proposalId } = contract;

    const proposalItem = proposalSelect.list.find(item => item.proposalId === proposalId);
    if (!proposalItem) throw new Error('Please check if the proposalId is valid');
    const proposedContractInputHash = await getOriginProposedContractInputHash({ txId: proposalItem.createTxId });
    if (!proposedContractInputHash) throw new Error('Please check if the proposalId is valid');
    const param = {
      proposalId,
      proposedContractInputHash
    };

    const result = await contractSend(contractMethod, param, true);
    let isError = false;
    if (!(result && +result.error === 0 || !result.error)) {
      isError = true;
      throw new Error((result.errorMessage || {}).message || 'Send transaction failed');
    }

    setApplyModal({
      visible: true,
      title: !isError ? 'Proposal is created！' : 'Proposal failed to be created！',
      children: (
        <>
          <CopylistItem
            label="Transaction ID："
            value={(result?.TransactionId || result?.result?.TransactionId || '')}
            href={`/tx/${result?.TransactionId || result?.result?.TransactionId || ''}`}
          />
        </>)
    });
  }, [proposalSelect]);

  async function submitContract(contract) {
    const {
      address,
      action,
      name,
      file,
      isOnlyUpdateName,
      onSuccess,
      contractMethod
    } = contract;
    let params = {};

    try {
      if (isOnlyUpdateName) {
        await updateContractName(wallet, currentWallet, {
          contractAddress: address,
          contractName: name,
          address: currentWallet.address,
        });
        message.success('Contract Name has been updated！');
        return;
      }
      switch (contractMethod) {
        case contractMethodType.ReleaseApprovedContract:
          await ReleaseApprovedContractAction(contract);
          return;
        case contractMethodType.ReleaseCodeCheckedContract:
          await ReleaseCodeCheckedContractAction(contract);
          return;
        default:
          break;
      }
      if (action === 'ProposeNewContract') {
        params = {
          category: '0',
          code: file
        };
      } else {
        params = {
          address,
          code: file
        };
      }
      const result = await contractSend(action, params);
      const Log = await getDeserializeLog(aelf, result?.TransactionId || result?.result?.TransactionId || '');
      const { proposalId } = Log ?? '';
      if (name && +name !== -1) {
        await addContractName(wallet, currentWallet, {
          contractName: name,
          txId: result.TransactionId || result.result.TransactionId,
          action: action === 'ProposeNewContract' ? 'DEPLOY' : 'UPDATE',
          address: currentWallet.address
        });
      }
      setApplyModal({
        visible: true,
        title: proposalId ? 'Proposal is created！' : 'Proposal failed to be created！',
        children: (
          <>
            {proposalId
              ? (
                <CopylistItem
                  label="Proposal ID："
                  value={proposalId}
                  href={`/proposalsDetail/${proposalId}`}
                />
              ) : 'This may be due to the failure in transaction which can be viewed via Transaction ID:'}
            <CopylistItem
              label="Transaction ID："
              value={result?.TransactionId || result?.result?.TransactionId || ''}
              href={`/tx/${result?.TransactionId || result?.result?.TransactionId || ''}`}
            />
          </>)
      });
    } catch (e) {
      console.error(e);
      message.error((e.errorMessage || {}).message || e.message || e.msg || 'Error happened');
    } finally {
      if (onSuccess) onSuccess();
      setContractResult({
        ...contract,
        confirming: false
      });
    }
  }

  function handleContractSubmit(results) {
    setContractResult({
      ...contractResult,
      ...results,
      confirming: true
    });
    const { isOnlyUpdateName } = results;
    Modal.confirm({
      title: isOnlyUpdateName ? 'Are you sure you want to update this contract name?'
        : 'Are you sure create this new proposal?',
      onOk: () => submitContract(results),
      onCancel: () => { setContractResult(v => ({ ...v, confirming: false })); handleCancel(); }
    });
  }

  async function submitNormalResult() {
    setNormalResult({
      ...normalResult,
      confirming: true
    });
    try {
      const {
        expiredTime,
        contractMethodName,
        toAddress,
        proposalType,
        organizationAddress,
        proposalDescriptionUrl,
        params: {
          decoded
        }
      } = normalResult;
      const result = await wallet.invoke({
        contractAddress: getContractAddress(proposalType),
        param: {
          contractMethodName,
          toAddress,
          params: uint8ToBase64(decoded || []),
          expiredTime: formatTimeToNano(expiredTime),
          organizationAddress,
          proposalDescriptionUrl
        },
        contractMethod: 'CreateProposal'
      });
      showTransactionResult(result);
    } catch (e) {
      console.error(e);
      message.error((e.errorMessage || {}).message || e.message || 'Error happened');
    } finally {
      setNormalResult({
        ...normalResult,
        confirming: false,
        isModalVisible: false
      });
    }
  }

  const contractModalCancle = useCallback(async () => {
    setApplyModal(initApplyModal);
  }, []);

  return (
    <div className="proposal-apply">
      <Tabs
        className="proposal-apply-tab"
        defaultActiveKey="normal"
      >
        <TabPane
          tab="Ordinary Proposal"
          key="normal"
        >
          <NormalProposal
            isModify={orgAddress === modifyData.orgAddress}
            {...(orgAddress === modifyData.orgAddress ? modifyData : {})}
            contractAddress={orgAddress === modifyData.orgAddress ? getContractAddress(modifyData.proposalType) : ''}
            aelf={aelf}
            wallet={wallet}
            currentWallet={currentWallet}
            submit={handleNormalSubmit}
          />
        </TabPane>
        <TabPane
          tab="Deploy/Update Contract"
          key="contract"
        >
          <ContractProposal
            loading={contractResult.confirming}
            submit={handleContractSubmit}
          />
        </TabPane>
      </Tabs>
      <Modal
        title="Are you sure create this new proposal?"
        visible={normalResult.isModalVisible}
        confirmLoading={normalResult.confirming}
        onOk={submitNormalResult}
        width={720}
        onCancel={handleCancel}
      >
        <div className="proposal-result-list">
          <div className="proposal-result-list-item gap-bottom">
            <span className="sub-title gap-right">Proposal Type:</span>
            <span className="proposal-result-list-item-value text-ellipsis">{normalResult.proposalType}</span>
          </div>
          <div className="proposal-result-list-item gap-bottom">
            <span className="sub-title gap-right">Organization Address:</span>
            <span className="proposal-result-list-item-value text-ellipsis">{normalResult.organizationAddress}</span>
          </div>
          <div className="proposal-result-list-item gap-bottom">
            <span className="sub-title gap-right">Contract Address:</span>
            <span className="proposal-result-list-item-value text-ellipsis">{normalResult.toAddress}</span>
          </div>
          <div className="proposal-result-list-item gap-bottom">
            <span className="sub-title gap-right">Contract Method:</span>
            <span className="proposal-result-list-item-value text-ellipsis">{normalResult.contractMethodName}</span>
          </div>
          <div className="proposal-result-list-item gap-bottom">
            <span className="sub-title gap-right">Contract Params:</span>
            <pre className="proposal-result-list-item-value">
              {
                JSON.stringify((normalResult.params || {}).origin, null, 2)
              }
            </pre>
          </div>
          <div className="proposal-result-list-item gap-bottom">
            <span className="sub-title gap-right">Description URL:</span>
            <a
              href={normalResult.proposalDescriptionUrl}
              className="proposal-result-list-item-value text-ellipsis"
              target="_blank"
              rel="noopener noreferrer"
            >
              {normalResult.proposalDescriptionUrl}
            </a>
          </div>
          <div className="proposal-result-list-item gap-bottom">
            <span className="sub-title gap-right">Expiration Time:</span>
            <span className="proposal-result-list-item-value text-ellipsis">
              {normalResult.expiredTime && normalResult.expiredTime.format('YYYY/MM/DD HH:mm:ss')}
            </span>
          </div>
        </div>
      </Modal>
      <Modal
        closable={false}
        maskClosable={false}
        footer={<Button type="primary" onClick={contractModalCancle}>OK</Button>}
        {...applyModal}
        onOk={contractModalCancle}
        onCancel={contractModalCancle}
      />
    </div>
  );
};

export default CreateProposal;
