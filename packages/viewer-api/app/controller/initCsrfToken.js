/**
 * @file init csrf token
 * @author atom-yang
 */
const Controller = require('../core/baseController');

class CsrfTokenController extends Controller {
  async initToken() {
    this.sendBody();
  }
}

module.exports = CsrfTokenController;
