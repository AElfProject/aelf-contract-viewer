/**
 * @file base controller
 * @author atom-yang
 */
const { Controller } = require('egg');

class BaseController extends Controller {

  sendBody(data = {}) {
    this.ctx.body = {
      msg: 'success',
      code: 0,
      ...this.ctx.body,
      data,
    };
  }

  error(err) {
    this.ctx.body = {
      msg: err.message,
      code: err.code || 500,
      errors: err.errors
    };
  }

  validate(rule) {
    this.ctx.validate(rule);
  }

  notFound(msg) {
    msg = msg || 'not found';
    this.ctx.throw(404, msg);
  }
}
module.exports = BaseController;
