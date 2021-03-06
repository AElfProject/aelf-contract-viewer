/**
 * @file get proposal list
 * @author atom-yang
 */
const Controller = require('../core/baseController');

class VotesController extends Controller {
  votedListRules = {
    search: {
      type: 'string',
      required: false,
      allowEmpty: true,
      trim: true
    },
    pre: {
      type: 'int',
      convertType: 'int',
      min: 1,
      required: false
    },
    pageSize: {
      type: 'int',
      convertType: 'int',
      min: 10,
      required: true
    },
    pageNum: {
      type: 'int',
      convertType: 'int',
      min: 1,
      required: true
    },
    proposalId: {
      type: 'string',
      required: true,
      min: 64,
      max: 64
    }
  };

  personalVotedRules = {
    proposalId: {
      type: 'string',
      required: true,
      min: 64,
      max: 64
    },
    address: {
      type: 'string',
      required: true
    }
  };

  allVotesRules = {
    search: {
      type: 'string',
      required: false,
      allowEmpty: true,
      trim: true
    },
    pageSize: {
      type: 'int',
      convertType: 'int',
      min: 10,
      required: true
    },
    pageNum: {
      type: 'int',
      convertType: 'int',
      min: 1,
      required: true
    },
    address: {
      type: 'string',
      required: true
    }
  };

  async getAllPersonalVotes() {
    const { ctx, app } = this;
    try {
      const errors = app.validator.validate(this.allVotesRules, ctx.request.query);
      if (errors) {
        throw errors;
      }
      const {
        pageSize,
        pageNum,
        search = '',
        address,
        proposalType
      } = ctx.request.query;
      const list = await app.model.Votes.allPersonVote(
        proposalType,
        address,
        pageSize,
        pageNum,
        search
      );
      this.sendBody(list);
    } catch (e) {
      this.error(e);
      this.sendBody();
    }
  }

  async getPersonalList() {
    const { ctx, app } = this;
    try {
      const errors = app.validator.validate(this.personalVotedRules, ctx.request.query);
      if (errors) {
        throw errors;
      }
      const {
        proposalId,
        address
      } = ctx.request.query;
      const list = await app.model.Votes.personalVoteHistory(address, proposalId);
      this.sendBody(list);
    } catch (e) {
      this.error(e);
      this.sendBody();
    }
  }

  async getList() {
    const { ctx, app } = this;
    try {
      const errors = app.validator.validate(this.votedListRules, ctx.request.query);
      if (errors) {
        throw errors;
      }
      const {
        proposalId,
        pageNum,
        pageSize,
        search = ''
      } = ctx.request.query;
      const result = await app.model.Votes.voteHistory(
        proposalId,
        pageSize,
        pageNum,
        search
      );
      this.sendBody(result);
    } catch (e) {
      this.error(e);
      this.sendBody();
    }
  }
}

module.exports = VotesController;
