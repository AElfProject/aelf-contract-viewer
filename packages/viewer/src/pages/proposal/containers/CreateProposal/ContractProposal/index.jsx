/**
 * @file contract proposal
 * @author atom-yang
 */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { QuestionCircleOutlined, UploadOutlined } from '@ant-design/icons';
import {
  Radio,
  Input,
  Button,
  Upload,
  Select,
  message,
  Tooltip,
  Form
} from 'antd';
import { request } from '../../../../../common/request';
import { API_PATH } from '../../../common/constants';

const FormItem = Form.Item;

const formItemLayout = {
  labelCol: {
    sm: { span: 6 },
  },
  wrapperCol: {
    sm: { span: 8 },
  },
};

const tailFormItemLayout = {
  wrapperCol: {
    sm: {
      span: 16,
      offset: 6
    }
  }
};

async function checkContractName(rule, value, isUpdate, currentContractInfo) {
  if (!value) {
    return;
  }
  if (+value === -1) {
    throw new Error('-1 is not valid');
  }
  if (isUpdate && value === currentContractInfo.contractName) {
    return;
  }
  const result = await request(API_PATH.CHECK_CONTRACT_NAME, {
    contractName: value
  }, { method: 'GET' });
  const {
    isExist = true
  } = result;
  if (!isExist) {
    // eslint-disable-next-line consistent-return
    return true;
  }
  throw new Error(`Contract name '${value}' is already exist`);
}

async function validateFile(rule, value) {
  if (!value || (Array.isArray(value) || value.length === 0)) {
    return;
  }
  const file = value[0];
  const {
    size
  } = file;
  if (size > 0 && size <= 2 * 1024 * 1024) {
    return;
  }
  throw new Error('DLL file is larger than 2MB');
}

function readFile(file) {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  return new Promise((resolve, reject) => {
    reader.onload = () => {
      const result = reader.result.split('base64,');
      if (result.length < 2) {
        reject(new Error('file has no content'));
      } else {
        resolve(result[1]);
      }
    };
    setTimeout(() => {
      reject(new Error('file is too large to read'));
    }, 10 * 1000);
  });
}

const ContractProposal = props => {
  const {
    loading,
    submit
  } = props;
  const [form] = Form.useForm();
  const {
    validateFields,
    setFieldsValue
  } = form;
  const [fileLength, setFileLength] = useState(0);
  const [currentContractInfo, setCurrentContractInfo] = useState({
    address: '',
    isSystemContract: false,
    contractName: -1
  });
  const [contractList, setContractList] = useState([]);
  useEffect(() => {
    request(API_PATH.GET_ALL_CONTRACTS, {
      search: ''
    }, { method: 'GET' })
      .then(res => {
        setContractList(res.list || []);
      })
      .catch(e => {
        message.error(e.message || 'Network Error');
      });
  }, []);
  const [isUpdate, setIsUpdate] = useState(false);
  function handleAction() {
    setFieldsValue({
      name: ''
    });
    setIsUpdate(!isUpdate);
  }
  const contractFilter = input => contractList
    .filter(({ contractName, address }) => contractName.indexOf(input) > -1 || address.indexOf(input) > -1).length > 0;
  function normFile(e) {
    if (Array.isArray(e)) {
      return e;
    }
    return e && e.fileList;
  }
  function handleUpload(e) {
    setFileLength(e.fileList.length);
  }
  async function handleSubmit() {
    try {
      const result = await validateFields();
      const {
        action,
        address = ''
      } = result;
      const file = await readFile(result.file[0].originFileObj);
      let name = result.name || '';
      if (isUpdate
        && (currentContractInfo.contractName === name)
      ) {
        name = '';
      }
      const submitObj = {
        file,
        action,
        address,
        name
      };
      console.log(submitObj);
      submit(submitObj);
    } catch (e) {
      console.log(e);
      message.error(e.message || 'Please input the required form!');
    }
  }

  function handleContractChange(address) {
    const info = contractList.filter(v => v.address === address)[0];
    setCurrentContractInfo(info);
    setFieldsValue({
      name: +info.contractName === -1 ? '' : info.contractName
    });
  }

  return (
    <div className="contract-proposal">
      <Form
        form={form}
        initialValues={{
          action: 'ProposeNewContract',
          address: '',
          name: +currentContractInfo.contractName === -1 ? '' : currentContractInfo.contractName
        }}
        {...formItemLayout}
      >
        <FormItem
          label="Contract Action"
          name="action"
        >
          <Radio.Group
            onChange={handleAction}
          >
            <Radio value="ProposeNewContract">Deploy Contract</Radio>
            <Radio value="ProposeUpdateContract">Update Contract</Radio>
          </Radio.Group>
        </FormItem>
        {
          isUpdate
            ? (
              <FormItem
                label="Contract Address"
                name="address"
                rules={[
                  {
                    required: true,
                    message: 'Please select a contract address!'
                  }
                ]}
              >
                <Select
                  placeholder="Please select a contract address"
                  showSearch
                  optionFilterProp="children"
                  filterOption={contractFilter}
                  onChange={handleContractChange}
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
              </FormItem>
            ) : null
        }
        <FormItem
          label="Contract Name"
          name="name"
          validateTrigger="onBlur"
          rules={
            [
              {
                required: false,
                type: 'string',
                validator: (rule, value) => checkContractName(rule, value, isUpdate, currentContractInfo)
              }
            ]
          }
        >
          <Input
            disabled={isUpdate && currentContractInfo.isSystemContract}
          />
        </FormItem>
        <FormItem
          label={(
            <span>
              Upload File&nbsp;
              <Tooltip
                title="When creating a 'Contract Deployment' proposal, you only need to upload the file,
                more information can be viewed on the public proposal page after the application is successful"
              >
                <QuestionCircleOutlined className="main-color" />
              </Tooltip>
            </span>
          )}
          name="file"
          valuePropName="fileList"
          getValueFromEvent={normFile}
          rules={
            [
              {
                required: true,
                message: 'Please upload the DLL file!'
              },
              {
                validator: validateFile
              }
            ]
          }
        >
          <Upload
            accept=".dll"
            beforeUpload={() => false}
            onChange={handleUpload}
            extra="Only support DLL file, less than 2MB"
          >
            <Button disabled={fileLength === 1}>
              <UploadOutlined className="gap-right-small" />
              Click to Upload
            </Button>
          </Upload>
        </FormItem>
        <Form.Item {...tailFormItemLayout}>
          <Button
            shape="round"
            type="primary"
            loading={loading}
            onClick={handleSubmit}
          >
            Apply
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

ContractProposal.propTypes = {
  submit: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired
};

export default ContractProposal;
