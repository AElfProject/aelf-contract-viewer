/**
 * @file get proposal list
 * @author atom-yang
 */
const Controller = require('../core/baseController');

class VotesController extends Controller {
  votedListRules = {
    proposalType: {
      type: 'enum',
      values: Object.values(this.app.config.constants.proposalTypes),
      required: true
    },
    pre: {
      type: 'number',
      convertType: true,
      min: 1,
      required: false
    },
    pageSize: {
      type: 'number',
      convertType: true,
      min: 10,
      required: true
    },
    proposalId: {
      type: 'string',
      required: true,
      min: 64,
      max: 64
    }
  };


  async getPersonalList() {
    const { ctx, app } = this;
    try {
      app.validator.validate(this.paramRules, ctx.request.query);
      const {
        proposalId,
        proposalType,
        address
      } = ctx.request.query;
      const {
        isAudit
      } = ctx;
      if (!isAudit) {
        throw new Error('need log in and sign');
      }
      const list = app.model.Votes.personalVoteHistory(address, proposalType, proposalId);
      this.sendBody({
        list
      });
    } catch (e) {
      this.error(e);
      this.sendBody();
    }
  }

  async getList() {
    const { ctx, app } = this;
    try {
      app.validator.validate(this.paramRules, ctx.request.query);
      const {
        proposalId,
        proposalType,
        pre,
        pageSize,
      } = ctx.request.query;
      const list = await app.model.Votes.voteHistory(
        proposalType,
        proposalId,
        pageSize,
        pre
      );
      this.sendBody({ list });
    } catch (e) {
      this.error(e);
      this.sendBody();
    }
  }
}

module.exports = VotesController;
