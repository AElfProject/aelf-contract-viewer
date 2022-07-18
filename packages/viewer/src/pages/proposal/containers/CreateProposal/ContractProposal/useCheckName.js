import { useCallback, useState } from 'react';
import { useDebounce } from 'react-use';
import { request } from '../../../../../common/request';
import { API_PATH } from '../../../common/constants';

const InputNameReg = /^[.,a-zA-Z\d]+$/;

export async function checkContractName(rule, value, isUpdate, currentContractInfo, isUpdateName) {
  if (!value) {
    if (isUpdateName && isUpdate) throw new Error('Please enter the contract name！');
    return;
  }
  if (+value === -1) {
    throw new Error('-1 is not valid');
  }
  if (isUpdate && value === currentContractInfo.contractName) {
    if (isUpdateName) {
      throw new Error('The name already exists！');
    } else {
      return;
    }
  }
  if (!InputNameReg.test(value)) {
    throw new Error('Please enter alphanumeric characters only！');
  }
  if (value.length > 150) {
    throw new Error('The maximum input character is 150');
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


// export type TagNameItemType = {
//   validateStatus?: ["success", "warning", "error", "validating", ""];
//   errorMsg?: string | null;
// };
export const useCheckName = (name, isUpdate, currentContractInfo, isUpdateName) => {
  const [check, setCheck] = useState({
    validateStatus: 'success',
    errorMsg: undefined,
  });
  const fetchHave = useCallback(async () => {
    setCheck({
      validateStatus: 'validating',
      errorMsg: undefined, // Inquiring...
    });
    try {
      await checkContractName('', name, isUpdate, currentContractInfo, isUpdateName);
      setCheck({
        validateStatus: 'success',
        errorMsg: undefined, // Inquiring...
      });
    } catch (e) {
      setCheck({
        validateStatus: 'error',
        errorMsg: e.message,
      });
    }
  }, [name]);
  useDebounce(fetchHave, 500, [name, isUpdate, currentContractInfo, isUpdateName]);

  return check;
};
