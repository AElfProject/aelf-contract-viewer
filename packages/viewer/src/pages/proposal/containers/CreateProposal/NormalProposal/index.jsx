/**
 * @file create normal proposal
 * @author atom-yang
 */
import React, {
  useEffect,
  useState,
  Suspense,
  lazy
} from 'react';
import moment from 'moment';
import {
  Form,
  Select,
  DatePicker,
  Button,
  Tooltip,
  Icon,
  Radio,
  message,
  Spin
} from 'antd';
import PropTypes from 'prop-types';
import {
  getSignParams,
  isInnerType,
  isSpecialParameters,
  formatTimeToNano,
  getContractMethodList,
  CONTRACT_INSTANCE_MAP,
  parseJSON,
  commonFilter,
  isSingleStringParameter,
  isEmptyInputType
} from '../../../common/utils';
import constants, { API_PATH } from '../../../common/constants';
import { request } from '../../../../../common/request';
import ContractParams from '../../../components/ContractParams';
// import JSONEditor from '../../../components/JSONEditor';
import './index.less';

const JSONEditor = lazy(() => import(/* webpackChunkName: "jsonEditor" */ '../../../components/JSONEditor'));

const {
  proposalTypes
} = constants;

const { Item: FormItem } = Form;

const formItemLayout = {
  labelCol: {
    sm: { span: 6 },
  },
  wrapperCol: {
    sm: { span: 8 },
  },
};

const FIELDS_MAP = {
  formProposalType: {
    label: (
      <span>
        Proposal Mode&nbsp;
        <Tooltip
          title="There are currently three proposal models.
          After selecting one, you will need to operate according to its rules.
          For specific rules, see 'Proposal rules'"
        >
          <Icon className="main-color" type="question-circle-o" />
        </Tooltip>
      </span>),
    placeholder: 'Please select a proposal mode',
    form: {
      rules: [
        {
          required: true,
          message: 'Please select a proposal mode!'
        }
      ]
    }
  },
  formOrgAddress: {
    label: (
      <span>
        Organization&nbsp;
        <Tooltip
          title="Choose an organization you trust.
          The organization will vote for your proposal.
          You also need to follow the rules of the organization.
          For the specific rules, see 'Organizations Tab'"
        >
          <Icon className="main-color" type="question-circle-o" />
        </Tooltip>
      </span>),
    placeholder: 'Please select an organization',
    form: {
      rules: [
        {
          required: true,
          message: 'Please select an organization!'
        }
      ]
    }
  },
  formContractAddress: {
    label: 'Contract Address',
    placeholder: 'Please select a contract',
    form: {
      rules: [
        {
          required: true,
          message: 'Please select a contract!'
        }
      ]
    }
  },
  formContractMethod: {
    label: 'Method Name',
    placeholder: 'Please select a contract method',
    form: {
      rules: [
        {
          required: true,
          message: 'Please select a contact method!'
        }
      ]
    }
  },
  params: {
    label: 'Method Params'
  },
  formExpiredTime: {
    label: (
      <span>
        Expiration Time&nbsp;
        <Tooltip
          title="Proposals must be voted on and released before the expiration time"
        >
          <Icon className="main-color" type="question-circle-o" />
        </Tooltip>
      </span>),
    placeholder: 'Please select a time',
    form: {
      rules: [
        {
          type: 'object',
          required: true,
          message: 'Please select a time!'
        }
      ]
    }
  }
};

const contractFilter = (input, _, list) => list
  .filter(({ contractName, address }) => contractName.indexOf(input) > -1 || address.indexOf(input) > -1).length > 0;


async function getOrganizationBySearch(wallet, currentWallet, proposalType, search = '') {
  const signedParams = await getSignParams(wallet, currentWallet);
  return request(API_PATH.GET_AUDIT_ORGANIZATIONS, {
    ...signedParams,
    search,
    proposalType
  }, { method: 'GET' });
}

async function getContractAddress(search = '') {
  return request(API_PATH.GET_ALL_CONTRACTS, {
    search
  }, { method: 'GET' });
}

const disabledDate = date => date && moment().isAfter(date);

const tailFormItemLayout = {
  wrapperCol: {
    sm: {
      span: 16,
      offset: 6
    }
  }
};

const paramsLayout = {
  labelCol: {
    sm: {
      span: 18
    }
  },
  wrapperCol: {
    sm: {
      span: 18
    }
  }
};

function parsedParams(inputType, originalParams) {
  const fieldsLength = Object.keys(inputType.toJSON().fields || {}).length;
  let result = {};
  if (fieldsLength === 0) {
    return '';
  }
  if (isInnerType(inputType)) {
    const type = inputType.fieldsArray[0];
    return originalParams[type.name];
  }
  Object.keys(originalParams).forEach(name => {
    const value = originalParams[name];
    const type = inputType.fields[name];
    if (value === '' || value === null || value === undefined) {
      return;
    }
    if (
      !Array.isArray(value)
      && typeof value === 'object'
      && value !== null
      && (type.type || '').indexOf('google.protobuf.Timestamp') === -1
    ) {
      result = {
        ...result,
        [name]: parsedParams(type.resolvedType, value)
      };
    } else if ((type.type || '').indexOf('google.protobuf.Timestamp') > -1) {
      result = {
        ...result,
        [name]: Array.isArray(value) ? value.filter(v => v).map(formatTimeToNano) : formatTimeToNano(value)
      };
    } else if (isSpecialParameters(type)) {
      result = {
        ...result,
        [name]: Array.isArray(value) ? value.filter(v => v) : value
      };
    } else {
      result = {
        ...result,
        [name]: Array.isArray(value) ? value.filter(v => v) : value
      };
    }
  });
  return result;
}

function parsedParamsWithoutSpecial(inputType, originalParams) {
  const fieldsLength = Object.keys(inputType.toJSON().fields || {}).length;
  let result = {};
  if (fieldsLength === 0) {
    return result;
  }
  Object.keys(originalParams).forEach(name => {
    const value = originalParams[name];
    const type = inputType.fields[name];
    if (value === '' || value === null || value === undefined) {
      return;
    }
    if (
      !Array.isArray(value)
      && typeof value === 'object'
      && value !== null
      && (type.type || '').indexOf('google.protobuf.Timestamp') === -1
    ) {
      result = {
        ...result,
        [name]: parsedParams(type.resolvedType, value)
      };
    } else if ((type.type || '').indexOf('google.protobuf.Timestamp') > -1) {
      result = {
        ...result,
        [name]: Array.isArray(value) ? value.filter(v => v).map(formatTimeToNano) : formatTimeToNano(value)
      };
    } else if ((type.type || '').indexOf('int') > -1) {
      result = {
        ...result,
        [name]: Array.isArray(value) ? value.filter(v => parseInt(v, 10)) : parseInt(value, 10)
      };
    } else {
      result = {
        ...result,
        [name]: Array.isArray(value) ? value.filter(v => v) : value
      };
    }
  });
  return result;
}

const NormalProposal = props => {
  const {
    aelf,
    isModify,
    proposalType,
    orgAddress,
    contractAddress,
    submit,
    wallet,
    currentWallet,
    form
  } = props;
  const {
    getFieldDecorator,
    setFieldsValue,
    validateFields
  } = form;

  const [methods, setMethods] = useState({
    list: [],
    isSingleString: false,
    isEmpty: false
  });
  const [paramsInputMethod, setParamsInputMethod] = useState('plain');
  const [organizationList, setOrganizationList] = useState([]);
  const [contractList, setContractList] = useState([]);
  // const [methodList, setMethodList] = useState([]);
  const [loadingStatus, setLoadingStatus] = useState({
    orgAddress: false,
    contractAddress: true,
    contractMethod: false
  });

  const handleContractAddressChange = async address => {
    let list = [];
    try {
      setFieldsValue({
        formContractMethod: ''
      });
      setMethods({
        ...methods,
        list: [],
        contractAddress: '',
        methodName: ''
      });
      setLoadingStatus({
        ...loadingStatus,
        contractAddress: false,
        contractMethod: true
      });
      list = await getContractMethodList(aelf, address);
    } catch (e) {
      message.error(e.message || 'Querying contract address list failed!');
    } finally {
      setLoadingStatus({
        ...loadingStatus,
        contractMethod: false,
        contractAddress: false,
      });
      setMethods({
        ...methods,
        list,
        contractAddress: address,
        methodName: ''
      });
    }
  };

  const handleProposalTypeChange = async type => {
    let list = [];
    try {
      setFieldsValue({
        formOrgAddress: ''
      });
      setLoadingStatus({
        ...loadingStatus,
        contractAddress: false,
        orgAddress: true
      });
      list = await getOrganizationBySearch(wallet, currentWallet, type);
    } catch (e) {
      message.error(e.message || 'Querying contract address list failed!');
    } finally {
      setLoadingStatus({
        ...loadingStatus,
        contractAddress: false,
        orgAddress: false
      });
      setOrganizationList(list);
    }
  };
  useEffect(() => {
    getContractAddress('').then(res => {
      setContractList(res.list);
      setLoadingStatus({
        ...loadingStatus,
        contractAddress: false
      });
    }).catch(e => {
      setLoadingStatus({
        ...loadingStatus,
        contractAddress: false
      });
      message.error(e.message | 'Network Error!');
    });
    if (isModify === true) {
      handleContractAddressChange(contractAddress);
      getOrganizationBySearch(wallet, currentWallet, proposalType).then(res => {
        setOrganizationList(res);
      });
    }
  }, []);

  const handleMethodChange = method => {
    setMethods({
      ...methods,
      methodName: method,
      isSingleString: isSingleStringParameter(CONTRACT_INSTANCE_MAP[methods.contractAddress][method].inputType),
      isEmpty: isEmptyInputType(CONTRACT_INSTANCE_MAP[methods.contractAddress][method].inputType)
    });
  };

  function handleInputMethod(e) {
    setParamsInputMethod(e.target.value);
  }

  const handleSubmit = async () => {
    let result;
    try {
      result = await validateFields();
      const {
        formProposalType,
        formOrgAddress,
        formContractAddress,
        formContractMethod,
        formExpiredTime,
        ...leftParams
      } = result;
      const method = CONTRACT_INSTANCE_MAP[methods.contractAddress][methods.methodName];
      const { inputType } = method;
      let parsed;
      if (paramsInputMethod === 'format') {
        parsed = parsedParams(inputType, leftParams);
        const error = inputType.verify(parsedParamsWithoutSpecial(inputType, leftParams));
        if (error) {
          throw new Error(`Contract params ${error}`);
        }
      } else {
        console.log(leftParams.realSpecialPlain);
        parsed = parseJSON(leftParams.realSpecialPlain);
        // todo: 无法verify
        // const error = inputType.verify(parsedParamsWithoutSpecial(inputType, parsed));
        // if (error) {
        //   throw new Error(`Contract params ${error}`);
        // }
      }
      let decoded;
      if (Array.isArray(parsed)) {
        decoded = method.packInput([...parsed]);
      } else if (typeof parsed === 'object' && parsed !== null) {
        decoded = method.packInput((JSON.parse(JSON.stringify(parsed))));
      } else {
        decoded = method.packInput(parsed);
      }
      console.log(result, parsed);
      submit({
        expiredTime: formExpiredTime,
        contractMethodName: formContractMethod,
        toAddress: formContractAddress,
        proposalType: formProposalType,
        organizationAddress: formOrgAddress,
        params: {
          origin: parsed,
          decoded
        }
      });
    } catch (e) {
      console.log(e);
      message.error(e.message || 'Please input the required form!');
    }
  };

  // todo: sdk对数组类型的object，Map类型未做处理
  return (
    <div className="normal-proposal">
      <Form
        {...formItemLayout}
      >
        <FormItem
          label={FIELDS_MAP.formProposalType.label}
          required
        >
          {
            getFieldDecorator('formProposalType', {
              ...FIELDS_MAP.formProposalType.form,
              initialValue: isModify ? proposalType : ''
            })(
              <Select
                placeholder={FIELDS_MAP.formProposalType.placeholder}
                onChange={handleProposalTypeChange}
              >
                <Select.Option value={proposalTypes.PARLIAMENT}>{proposalTypes.PARLIAMENT}</Select.Option>
                <Select.Option value={proposalTypes.ASSOCIATION}>{proposalTypes.ASSOCIATION}</Select.Option>
                <Select.Option value={proposalTypes.REFERENDUM}>{proposalTypes.REFERENDUM}</Select.Option>
              </Select>
            )
          }
        </FormItem>
        <FormItem
          label={FIELDS_MAP.formOrgAddress.label}
          required
        >
          {
            getFieldDecorator('formOrgAddress', {
              ...FIELDS_MAP.formOrgAddress.form,
              initialValue: isModify ? orgAddress : ''
            })(
              <Select
                placeholder={FIELDS_MAP.formOrgAddress.placeholder}
                loading={loadingStatus.orgAddress}
                showSearch
                optionFilterProp="children"
                filterOption={commonFilter}
              >
                {
                  organizationList
                    .map(v => (<Select.Option key={v} value={v}>{v}</Select.Option>))
                }
              </Select>
            )
          }
        </FormItem>
        <FormItem
          label={FIELDS_MAP.formContractAddress.label}
          required
        >
          {
            getFieldDecorator('formContractAddress', {
              ...FIELDS_MAP.formContractAddress.form,
              initialValue: isModify ? contractAddress : ''
            })(
              <Select
                placeholder={FIELDS_MAP.formContractAddress.placeholder}
                onChange={handleContractAddressChange}
                showSearch
                optionFilterProp="children"
                filterOption={(...args) => contractFilter(...args, contractList)}
                loading={loadingStatus.contractAddress}
              >
                {
                  contractList.map(v => (
                    <Select.Option
                      key={v.address}
                      value={v.address}
                    >
                      {v.contractName || v.address}
                    </Select.Option>
                  ))
                }
              </Select>
            )
          }
        </FormItem>
        <FormItem
          label={FIELDS_MAP.formContractMethod.label}
          required
        >
          {
            getFieldDecorator('formContractMethod', {
              ...FIELDS_MAP.formContractMethod.form
            })(
              <Select
                placeholder={FIELDS_MAP.formContractMethod.placeholder}
                showSearch
                optionFilterProp="children"
                filterOption={commonFilter}
                loading={loadingStatus.contractMethod}
                onChange={handleMethodChange}
              >
                {
                  methods.list
                    .map(v => (<Select.Option key={v} value={v}>{v}</Select.Option>))
                }
              </Select>
            )
          }
        </FormItem>
        <FormItem
          label={FIELDS_MAP.params.label}
          className={methods && methods.methodName && !methods.isEmpty ? 'normal-proposal-params' : ''}
          required
        >
          <Radio.Group onChange={handleInputMethod} value={paramsInputMethod}>
            <Radio.Button value="plain">Input in plain text</Radio.Button>
            <Radio.Button value="format">Input in formatted</Radio.Button>
          </Radio.Group>
          {
            paramsInputMethod === 'format' && methods && methods.methodName ? (
              <ContractParams
                layout={paramsLayout}
                getFieldDecorator={getFieldDecorator}
                inputType={CONTRACT_INSTANCE_MAP[methods.contractAddress][methods.methodName].inputType}
              />
            ) : null
          }
          {
            paramsInputMethod === 'plain' && methods && methods.methodName && !methods.isEmpty ? (
              (
                <Suspense fallback={<Spin className="text-ellipsis" />}>
                  {
                    getFieldDecorator('realSpecialPlain', {
                      initialValue: '',
                      trigger: 'onBlur'
                    })(
                      <JSONEditor
                        className="params-input"
                        type={methods.isSingleString ? 'plaintext' : 'json'}
                      />
                      // <TextArea autoSize />
                    )
                  }
                </Suspense>
              )
            ) : null
          }
        </FormItem>
        <FormItem
          label={FIELDS_MAP.formExpiredTime.label}
          required
        >
          {
            getFieldDecorator('formExpiredTime', {
              ...FIELDS_MAP.formExpiredTime.form
            })(
              <DatePicker
                showTime
                disabledDate={disabledDate}
                disabledTime={disabledDate}
                placeholder={FIELDS_MAP.formExpiredTime.placeholder}
              />
            )
          }
        </FormItem>
        <Form.Item {...tailFormItemLayout}>
          <Button
            shape="round"
            type="primary"
            onClick={handleSubmit}
          >
            Apply
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

NormalProposal.propTypes = {
  aelf: PropTypes.shape({
    chain: PropTypes.object
  }).isRequired,
  isModify: PropTypes.bool.isRequired,
  proposalType: PropTypes.string,
  orgAddress: PropTypes.string,
  contractAddress: PropTypes.string,
  submit: PropTypes.func.isRequired,
  wallet: PropTypes.shape({
    sign: PropTypes.func.isRequired,
    login: PropTypes.func.isRequired
  }).isRequired,
  currentWallet: PropTypes.shape({
    address: PropTypes.string,
    publicKey: PropTypes.string
  }).isRequired,
  form: PropTypes.shape({
    getFieldDecorator: PropTypes.func,
    getFieldsValue: PropTypes.func,
    getFieldValue: PropTypes.func,
    setFieldsValue: PropTypes.func,
    validateFields: PropTypes.func
  }).isRequired
};

NormalProposal.defaultProps = {
  proposalType: '',
  orgAddress: '',
  contractAddress: ''
};

export default Form.create()(NormalProposal);
