/**
 * @file approve token modal
 */
import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Switch, Case } from 'react-if';
import Decimal from 'decimal.js';
import {
  Form,
  Modal,
  InputNumber,
  Steps,
  message,
  Spin
} from 'antd';
import {
  getContractAddress,
  showTransactionResult,
  getTxResult
} from '../../../common/utils';
import {
  getContract
} from '../../../../../common/utils';
import constants from '../../../common/constants';
import './index.less';

const { Step } = Steps;

const FormItem = Form.Item;

const {
  proposalTypes,
  proposalActions
} = constants;

async function getTokenDecimal(aelf, symbol) {
  try {
    const token = await getContract(aelf, getContractAddress('Token'));
    const result = await token.GetTokenInfo.call({
      symbol
    });
    return result.decimals;
  } catch (e) {
    console.error(e);
    return 8;
  }
}

const formItemLayout = {
  labelCol: {
    sm: { span: 4 },
  },
  wrapperCol: {
    sm: { span: 16 },
  },
};

const sendTransaction = async (wallet, contractAddress, method, param) => {
  const result = await wallet.invoke({
    contractAddress,
    param,
    contractMethod: method
  });
  showTransactionResult(result);
  return result;
};

const formDesc = {
  amount: {
    name: 'amount',
    initialValue: 0,
    rules: [
      {
        required: true,
        message: 'Please input the amount'
      },
      {
        type: 'number',
        validator(rule, value) {
          return value > 0 ? Promise.resolve() : Promise.reject(new Error('Value must be a number larger than 0'));
        }
      }
    ]
  }
};

const ApproveTokenModal = props => {
  const {
    action,
    aelf,
    proposalType,
    onCancel,
    onConfirm,
    visible,
    wallet,
    tokenSymbol
  } = props;
  const [form] = Form.useForm();
  const {
    // getFieldDecorator,
    validateFields
  } = form;
  const [decimal, setDecimal] = useState(8);
  const [stepInfo, setStepInfo] = useState({
    current: 0,
    status: 'wait',
    loading: false,
    action: 'Approve',
    result: {
      canMove: true
    }
  });

  useEffect(() => {
    getTokenDecimal(aelf, tokenSymbol).then(v => setDecimal(v));
  }, [tokenSymbol]);

  function handleCancel() {
    onCancel();
  }

  async function handleOk() {
    if (stepInfo.current === 0) {
      try {
        const results = await validateFields();
        setStepInfo({
          ...stepInfo,
          status: 'process',
          loading: true,
          result: {}
        });
        const spender = getContractAddress(proposalType);
        let {
          amount
        } = results;
        amount = new Decimal(amount).mul(`1e${decimal}`).toString();
        const params = {
          symbol: tokenSymbol,
          amount,
          spender
        };
        const result = await sendTransaction(wallet, getContractAddress('Token'), 'Approve', params);
        const txId = result.result.TransactionId;
        setStepInfo({
          ...stepInfo,
          loading: true,
          current: 1,
          status: 'process',
          action: 'Waiting',
          result: {
            txId
          }
        });
        const txResult = await getTxResult(aelf, txId, 0, 6000);
        const canMove = txResult.Status === 'MINED' || txResult.Status === 'PENDING';
        setStepInfo({
          ...stepInfo,
          loading: false,
          current: 1,
          status: canMove ? 'process' : 'error',
          action: 'Next',
          result: {
            txId,
            txResult,
            canMove
          }
        });
        message.info('Please wait for the transaction is mined');
      } catch (e) {
        setStepInfo({
          ...stepInfo,
          current: 0,
          status: 'process',
          action: 'Approve',
          loading: false
        });
        console.error(e);
        message.error(e.message || 'Send Transaction failed');
      }
    } else if (stepInfo.current === 1) {
      setStepInfo({
        ...stepInfo,
        current: 2,
        status: 'wait',
        action
      });
    } else {
      setStepInfo({
        ...stepInfo,
        loading: true
      });
      onConfirm(action);
    }
  }

  return (
    <Modal
      title={action}
      visible={visible}
      onCancel={handleCancel}
      onOk={handleOk}
      okText={stepInfo.action}
      okButtonProps={{
        loading: stepInfo.loading,
        disabled: !stepInfo.result.canMove
      }}
      destroyOnClose
      width={720}
    >
      <Steps
        className="gap-bottom"
        current={stepInfo.current}
        status={stepInfo.status}
      >
        <Step title="Approve Token" description="Approve Token to proposal contract" />
        <Step title="Waiting" description="Waiting for transaction mined" />
        <Step title={action} description="Vote for the proposal" />
      </Steps>
      <Switch>
        <Case condition={stepInfo.current === 0}>
          <Form
            form={form}
            className="approve-token-form"
            {...formItemLayout}
          >
            <FormItem
              label="Token"
            >
              <span>{tokenSymbol}</span>
            </FormItem>
            <FormItem
              label="Amount"
              {...formDesc.amount}
            >
              <InputNumber
                precision={4}
                min={0}
              />
            </FormItem>
          </Form>
        </Case>
        <Case condition={stepInfo.current === 1}>
          <Spin spinning={stepInfo.loading}>
            <div className="approve-token-transaction">
              Transaction ID: {stepInfo.result.txId}
            </div>
            <pre className="approve-token-transaction-result">
              {JSON.stringify(stepInfo.result.txResult, null, 2)}
            </pre>
          </Spin>
        </Case>
        <Case condition={stepInfo.current === 2}>
          <div className="approve-token-transaction text-center">
            Please click {action} button below to finish
          </div>
        </Case>
      </Switch>
    </Modal>
  );
};

ApproveTokenModal.propTypes = {
  action: PropTypes.oneOf(Object.values(proposalActions)).isRequired,
  aelf: PropTypes.shape({
    chain: PropTypes.object
  }).isRequired,
  proposalType: PropTypes.oneOf(Object.values(proposalTypes)).isRequired,
  tokenSymbol: PropTypes.string.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  visible: PropTypes.bool.isRequired,
  wallet: PropTypes.shape({
    invoke: PropTypes.func
  }).isRequired
};

export default ApproveTokenModal;
