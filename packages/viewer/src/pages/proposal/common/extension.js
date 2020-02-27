/**
 * @file NightElfCheck
 * @author zhouminghui
 */
import contants from './constants';

const {
  viewer,
  APP_NAME,
  DEFAUT_RPCSERVER
} = contants;

const contracts = viewer.contractAddress.map(v => ({
  ...v,
  chainId: viewer.chainId,
  github: ''
}));

export default class Extension {
  static instance = null;

  constructor(options) {
    if (Extension.instance) {
      return Extension.instance;
    }
    this.options = {
      ...options
    };
    this.currentWallet = {};
    this.contracts = {};
    this.elfInstance = null;
    this.isExist = new Promise(resolve => {
      if (window.NightElf || window.parent.NightElf) {
        resolve(true);
      } else {
        document.addEventListener('NightElf', () => {
          resolve(true);
        });
        setTimeout(() => {
          resolve(!!(window.NightElf || window.parent.NightElf));
        }, 5000);
      }
    }).then(result => {
      if (result) {
        this.elfInstance = new (window.NightElf || window.parent.NightElf).AElf({
          httpProvider: [
            DEFAUT_RPCSERVER
          ],
          appName: APP_NAME
        });
      }
      return result;
    }).catch(() => false);
    Extension.instance = this;
  }

  async login() {
    const isExist = await this.isExist;
    if (isExist) {
      return new Promise((resolve, reject) => {
        this.elfInstance.login({
          appName: APP_NAME,
          payload: {
            method: 'LOGIN',
            contracts
          }
        }, (error, result) => {
          if (error) {
            reject(error);
          } else if (result && +result.error === 0) {
            let detail;
            try {
              detail = JSON.parse(result.detail);
            } catch (e) {
              detail = result.detail;
            }
            this.currentWallet = {
              ...detail,
              publicKey: `04${detail.publicKey.x}${detail.publicKey.y}`
            };
            resolve(this.currentWallet);
          } else {
            reject(result);
          }
        });
      }).then(result => {
        this.elfInstance.chain.getChainStatus();
        return result;
      });
    }
    throw new Error('Plugin is not exist');
  }

  async logout(address) {
    return new Promise((resolve, reject) => {
      this.elfInstance.logout({
        appName: APP_NAME,
        address
      }, (error, result) => {
        if (error) {
          reject(error);
        } else {
          this.currentWallet = {};
          this.contracts = {};
          resolve(result);
        }
      }).catch(error => {
        reject(error);
      });
    });
  }

  sign(hex) {
    return this.elfInstance.getSignature({
      address: this.currentWallet.address,
      hexToBeSign: hex
    }).then(result => {
      if (result && +result.error === 0) {
        return result.signature;
      }
      throw new Error('sign failed');
    });
  }

  async invoke(params) {
    const {
      contractAddress,
      param,
      contractMethod
    } = params;
    if (!this.contracts[contractAddress]) {
      await this.checkPermission();
      const con = await this.elfInstance.chain.contractAt(contractAddress, {
        address: this.currentWallet.address
      });
      this.contracts = {
        ...this.contracts,
        [contractAddress]: con
      };
    }
    const contract = this.contracts[contractAddress];
    return contract[contractMethod](param);
  }

  async checkPermission() {
    return new Promise((resolve, reject) => {
      this.elfInstance.checkPermission({
        type: 'address',
        address: this.currentWallet.address
      }, async (error, result) => {
        if (error) {
          reject(error);
        } else if (result && +result.error === 0) {
          let { permissions } = result;
          permissions = permissions.filter(item => item.appName === APP_NAME);
          let notInPermission = [];
          if (permissions.length > 0) {
            let {
              contracts: contractsInPermission
            } = permissions[0];
            contractsInPermission = contractsInPermission.map(item => item.contractAddress);
            notInPermission = contracts.filter(({ contractAddress: a }) => contractsInPermission.indexOf(a) === -1);
          } else {
            notInPermission = [...contracts];
          }
          if (notInPermission.length > 0) {
            this.elfInstance.setContractPermission({
              appName: APP_NAME,
              chainId: viewer.chainId,
              payload: {
                address: this.currentWallet.address,
                contracts
              }
            }, (err, res) => {
              if (err) {
                reject(err);
              } else if (res && +res.error === 0) {
                resolve(res);
              } else {
                reject(res);
              }
            });
          } else {
            resolve();
          }
        } else {
          reject(result);
        }
      });
    });
  }
}
