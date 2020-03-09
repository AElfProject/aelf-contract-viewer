/**
 * @file create organization
 * @author atom-yang
 */
import React, { useEffect, useState } from 'react';
import AElf from 'aelf-sdk';
import PropTypes from 'prop-types';
import Decimal from 'decimal.js';
import {
  Link
} from 'react-router-dom';
import ReactIf from 'react-if';
import {
  useSelector
} from 'react-redux';
import {
  Form,
  Button,
  Select,
  Tooltip,
  Icon,
  InputNumber,
  Input,
  Switch,
  message, Divider
} from 'antd';
import constants, {
  API_PATH
} from '../../common/constants';
import { request } from '../../../../common/request';
import {
  commonFilter,
  getContractAddress,
  showTransactionResult
} from '../../common/utils';
import './index.less';

const {
  Switch: ConditionSwitch,
  Case
} = ReactIf;

const { TextArea } = Input;

const {
  proposalTypes
} = constants;

const FormItem = Form.Item;

const formItemLayout = {
  labelCol: {
    sm: { span: 6 },
  },
  wrapperCol: {
    sm: { span: 8 },
  },
};

function validateAddressList(rule, value) {
  if (value && value.length > 0) {
    const inValid = value.split(',').filter(v => {
      try {
        AElf.utils.base58.decode(v);
        return false;
      } catch (e) {
        return true;
      }
    });
    return inValid.length === 0 || new Error(`${inValid[0]} is not a valid address`);
  }
  return true;
}

const FIELDS_MAP = {
  proposalType: {
    name: 'proposalType',
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
  minimalApprovalThreshold: {
    name: 'proposalReleaseThreshold.minimalApprovalThreshold',
    label: 'Minimal Approval Threshold',
    placeholder: '',
    form: {
      rules: [
        {
          required: true,
          message: 'Please set the threshold'
        },
        {
          message: 'Minimal Approval Threshold needs to be larger than 0',
          validator(rule, value) {
            return value > 0;
          }
        }
      ]
    }
  },
  maximalRejectionThreshold: {
    name: 'proposalReleaseThreshold.maximalRejectionThreshold',
    label: 'Maximal Rejection Threshold',
    placeholder: '',
    form: {
      rules: [
        {
          required: true,
          message: 'Please set the threshold'
        }
      ]
    }
  },
  maximalAbstentionThreshold: {
    name: 'proposalReleaseThreshold.maximalAbstentionThreshold',
    label: 'Maximal Abstention Threshold',
    placeholder: '',
    form: {
      rules: [
        {
          required: true,
          message: 'Please set the threshold'
        }
      ]
    }
  },
  minimalVoteThreshold: {
    name: 'proposalReleaseThreshold.minimalVoteThreshold',
    label: 'Minimal Vote Threshold',
    placeholder: '',
    form: {
      rules: [
        {
          required: true,
          message: 'Please set the threshold'
        }
      ]
    }
  },
  tokenSymbol: {
    name: 'tokenSymbol',
    label: 'Token Symbol',
    placeholder: 'Please select a token',
    form: {
      rules: [
        {
          required: true,
          message: 'Please select a token!'
        }
      ]
    }
  },
  proposerAuthorityRequired: {
    name: 'proposerAuthorityRequired',
    label: (
      <span>
        Proposer Authority Required&nbsp;
        <Tooltip
          title="set to false to allow anyone to create a new proposal"
        >
          <Icon className="main-color" type="question-circle-o" />
        </Tooltip>
      </span>),
    placeholder: '',
    form: {
      rules: [
        {
          required: true,
          message: 'Please set the value!'
        }
      ]
    }
  },
  members: {
    name: 'members',
    label: (
      <span>
        Organization members&nbsp;
        <Tooltip
          title="Input the address list of members,
          separated by commas, such as
          `28Y8JA1i2cN6oHvdv7EraXJr9a1gY6D1PpJXw9QtRMRwKcBQMK,x7G7VYqqeVAH8aeAsb7gYuTQ12YS1zKuxur9YES3cUj72QMxJ`"
        >
          <Icon className="main-color" type="question-circle-o" />
        </Tooltip>
      </span>),
    placeholder: 'Input the address list of members, separated by commas',
    form: {
      rules: [
        {
          required: false,
          type: 'string',
          // message: 'Please input the correct members list',
          validator: validateAddressList
        }
      ]
    }
  },
  proposers: {
    name: 'proposers',
    label: (
      <span>
        Proposer White List&nbsp;
        <Tooltip
          title="Input the address list of proposers,
          separated by commas, such as
           `28Y8JA1i2cN6oHvdv7EraXJr9a1gY6D1PpJXw9QtRMRwKcBQMK,x7G7VYqqeVAH8aeAsb7gYuTQ12YS1zKuxur9YES3cUj72QMxJ`"
        >
          <Icon className="main-color" type="question-circle-o" />
        </Tooltip>
      </span>),
    placeholder: 'Input the address list of proposers, separated by commas',
    form: {
      rules: [
        {
          required: false,
          type: 'string',
          // message: 'Please input the correct proposers list',
          validator: validateAddressList
        }
      ]
    }
  }
};

const tailFormItemLayout = {
  wrapperCol: {
    sm: {
      span: 16,
      offset: 6
    }
  }
};

async function getTokenList(search = '') {
  try {
    const { list = [] } = await request(API_PATH.GET_TOKEN_LIST, {
      search
    }, { method: 'GET' });
    console.log(list);
    if (list.length === 0) {
      throw new Error('Empty token');
    }
    return list;
  } catch (e) {
    console.error(e);
    return [{
      symbol: 'ELF',
      decimals: 8
    }];
  }
}

const INPUT_PROPS_MAP = {
  [proposalTypes.PARLIAMENT]: {
    formatter: value => `${value}%`,
    min: 0,
    max: 100,
    precision: 2
  },
  [proposalTypes.ASSOCIATION]: {
    formatter: value => value,
    min: 0,
    precision: 0
  },
  [proposalTypes.REFERENDUM]: {
    formatter: value => value,
    min: 0,
    precision: 4
  },
};

const ABSTRACT_TOTAL = 100;

function getContractParams(formValue, tokenList) {
  const {
    proposalType,
    tokenSymbol,
    proposers = '',
    members = '',
    proposerAuthorityRequired = false,
    proposalReleaseThreshold
  } = formValue;
  const proposersList = proposers.split(',').filter(v => v);
  const membersList = members.split(',').filter(v => v);
  switch (proposalType) {
    case proposalTypes.PARLIAMENT:
      return {
        proposalReleaseThreshold: Object.keys(proposalReleaseThreshold).reduce((acc, key) => ({
          ...acc,
          [key]: proposalReleaseThreshold[key] * ABSTRACT_TOTAL
        }), {}),
        proposerAuthorityRequired,
        parliamentMemberProposingAllowed: true
      };
    case proposalTypes.ASSOCIATION:
      return {
        proposalReleaseThreshold,
        organizationMemberList: {
          organizationMembers: membersList
        },
        proposerWhiteList: {
          proposers: proposersList
        }
      };
    case proposalTypes.REFERENDUM:
      // eslint-disable-next-line no-case-declarations
      let decimal = tokenList.filter(v => v.symbol === tokenSymbol);
      decimal = decimal.length > 0 ? decimal[0].decimals : 8;
      return {
        proposalReleaseThreshold: Object.keys(proposalReleaseThreshold).reduce((acc, key) => ({
          ...acc,
          [key]: new Decimal(proposalReleaseThreshold[key]).mul(`1e${decimal}`)
        }), {}),
        tokenSymbol,
        proposerWhiteList: {
          proposers: proposersList
        }
      };
    default:
      throw new Error('why are you here');
  }
}

const CreateOrganization = props => {
  const {
    form
  } = props;
  const {
    getFieldDecorator,
    validateFields
  } = form;
  const common = useSelector(state => state.common);
  const {
    wallet
  } = common;
  const [tokenList, setTokenList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    proposalType: proposalTypes.PARLIAMENT
  });
  useEffect(() => {
    getTokenList().then(list => {
      setTokenList(list);
    });
  }, []);

  async function handleSubmit() {
    try {
      const formValue = await validateFields();
      console.log(formValue);
      setIsLoading(true);
      const param = getContractParams(formValue, tokenList);
      const result = await wallet.invoke({
        contractAddress: getContractAddress(formValue.proposalType),
        param,
        contractMethod: 'CreateOrganization'
      });
      showTransactionResult(result);
    } catch (e) {
      console.log(e);
      message.error((e.errorMessage || {}).message || e.message || 'Please input the required form field');
    } finally {
      setIsLoading(false);
    }
  }

  function handleProposalTypeChange(type) {
    setFormData({
      ...formData,
      proposalType: type
    });
  }

  return (
    <div className="create-organization">
      <div className="create-organization-header">
        <div className="create-organization-header-title">
          Create Organization
        </div>
        <div className="create-organization-header-action">
          <Link to="/organizations">&lt;Back to Organization List</Link>
        </div>
      </div>
      <Divider />
      <Form
        {...formItemLayout}
      >
        <FormItem
          label={FIELDS_MAP.proposalType.label}
          required
        >
          {
            getFieldDecorator(FIELDS_MAP.proposalType.name, {
              ...FIELDS_MAP.proposalType.form,
              initialValue: proposalTypes.PARLIAMENT
            })(
              <Select
                placeholder={FIELDS_MAP.proposalType.placeholder}
                onChange={handleProposalTypeChange}
              >
                <Select.Option value={proposalTypes.PARLIAMENT}>{proposalTypes.PARLIAMENT}</Select.Option>
                <Select.Option value={proposalTypes.ASSOCIATION}>{proposalTypes.ASSOCIATION}</Select.Option>
                <Select.Option value={proposalTypes.REFERENDUM}>{proposalTypes.REFERENDUM}</Select.Option>
              </Select>
            )
          }
        </FormItem>
        <ConditionSwitch>
          <Case condition={formData.proposalType === proposalTypes.PARLIAMENT}>
            <FormItem
              label={FIELDS_MAP.proposerAuthorityRequired.label}
              required
            >
              {
                getFieldDecorator(FIELDS_MAP.proposerAuthorityRequired.name, {
                  ...FIELDS_MAP.proposerAuthorityRequired.form,
                  initialValue: false,
                  valuePropName: 'checked'
                })(
                  <Switch />
                )
              }
            </FormItem>
          </Case>
          <Case condition={formData.proposalType === proposalTypes.ASSOCIATION}>
            <FormItem
              label={FIELDS_MAP.members.label}
            >
              {
                getFieldDecorator(FIELDS_MAP.members.name, {
                  ...FIELDS_MAP.members.form
                })(
                  <TextArea
                    placeholder={FIELDS_MAP.members.placeholder}
                    autoSize
                  />
                )
              }
            </FormItem>
          </Case>
          <Case condition={formData.proposalType === proposalTypes.REFERENDUM}>
            <FormItem
              label={FIELDS_MAP.tokenSymbol.label}
              required
            >
              {
                getFieldDecorator(FIELDS_MAP.tokenSymbol.name, {
                  ...FIELDS_MAP.tokenSymbol.form,
                  initialValue: 'ELF'
                })(
                  <Select
                    showSearch
                    optionFilterProp="children"
                    filterOption={commonFilter}
                    placeholder={FIELDS_MAP.tokenSymbol.placeholder}
                  >
                    {tokenList.map(v => (<Select.Option key={v.symbol} value={v.symbol}>{v.symbol}</Select.Option>))}
                  </Select>
                )
              }
            </FormItem>
          </Case>
        </ConditionSwitch>
        {
          formData.proposalType && formData.proposalType !== proposalTypes.PARLIAMENT
            ? (
              <FormItem
                label={FIELDS_MAP.proposers.label}
              >
                {
                  getFieldDecorator(FIELDS_MAP.proposers.name, {
                    ...FIELDS_MAP.proposers.form
                  })(
                    <TextArea
                      placeholder={FIELDS_MAP.proposers.placeholder}
                      autoSize
                    />
                  )
                }
              </FormItem>
            ) : null
        }
        <FormItem
          label={FIELDS_MAP.minimalApprovalThreshold.label}
          required
        >
          {
            getFieldDecorator(FIELDS_MAP.minimalApprovalThreshold.name, {
              ...FIELDS_MAP.minimalApprovalThreshold.form
            })(
              <InputNumber
                {...INPUT_PROPS_MAP[formData.proposalType || proposalTypes.PARLIAMENT]}
              />
            )
          }
        </FormItem>
        <FormItem
          label={FIELDS_MAP.maximalRejectionThreshold.label}
          required
        >
          {
            getFieldDecorator(FIELDS_MAP.maximalRejectionThreshold.name, {
              ...FIELDS_MAP.maximalRejectionThreshold.form
            })(
              <InputNumber
                {...INPUT_PROPS_MAP[formData.proposalType || proposalTypes.PARLIAMENT]}
              />
            )
          }
        </FormItem>
        <FormItem
          label={FIELDS_MAP.maximalAbstentionThreshold.label}
          required
        >
          {
            getFieldDecorator(FIELDS_MAP.maximalAbstentionThreshold.name, {
              ...FIELDS_MAP.maximalAbstentionThreshold.form
            })(
              <InputNumber
                {...INPUT_PROPS_MAP[formData.proposalType || proposalTypes.PARLIAMENT]}
              />
            )
          }
        </FormItem>
        <FormItem
          label={FIELDS_MAP.minimalVoteThreshold.label}
          required
        >
          {
            getFieldDecorator(FIELDS_MAP.minimalVoteThreshold.name, {
              ...FIELDS_MAP.minimalVoteThreshold.form
            })(
              <InputNumber
                {...INPUT_PROPS_MAP[formData.proposalType || proposalTypes.PARLIAMENT]}
              />
            )
          }
        </FormItem>
        <FormItem {...tailFormItemLayout}>
          <Button
            shape="round"
            type="primary"
            loading={isLoading}
            onClick={handleSubmit}
          >
            Apply
          </Button>
        </FormItem>
      </Form>
    </div>
  );
};

CreateOrganization.propTypes = {
  form: PropTypes.shape({
    getFieldDecorator: PropTypes.func,
    getFieldsValue: PropTypes.func,
    getFieldValue: PropTypes.func,
    setFieldsValue: PropTypes.func,
    validateFields: PropTypes.func
  }).isRequired
};

export default Form.create()(CreateOrganization);
