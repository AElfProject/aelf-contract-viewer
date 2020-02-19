/**
 * @file wallet related
 * @author atom-yang
 */
import Extension from './extension';

const WALLET_TYPE = {
  EXTENSION: Extension
};

export class Wallet {
  constructor(options = {}) {
    this.options = {
      ...options
    };
    this.proxy = new WALLET_TYPE[options.walletType](this.options);
  }

  login(...args) {
    return this.proxy.login(...args);
  }

  logout(...args) {
    return this.proxy.logout(...args);
  }

  sign(...args) {
    return this.proxy.sign(...args);
  }
}
