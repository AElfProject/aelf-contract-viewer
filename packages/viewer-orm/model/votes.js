/**
 * @file votes model
 * @author atom-yang
 */
const Sequelize = require('sequelize');
const { commonModelOptions } = require('../common');
const config = require('../config');

const {
  constants: {
    proposalTypes
  }
} = config;

const {
  Model,
  BIGINT,
  BOOLEAN,
  STRING,
  ENUM,
  DATE,
  NOW,
  Op
} = Sequelize;

// votes for proposals
const votesDescription = {
  id: {
    type: BIGINT,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
    field: 'id'
  },
  txId: {
    type: STRING(255),
    allowNull: false,
    field: 'tx_id'
  },
  proposalId: {
    type: STRING(255),
    allowNull: false,
    field: 'proposal_id'
  },
  voter: {
    type: STRING(255),
    allowNull: false
  },
  amount: {
    type: BIGINT,
    allowNull: false,
    defaultValue: 0,
  },
  symbol: {
    type: STRING(255),
    allowNull: false,
    defaultValue: 'none'
  },
  action: {
    type: ENUM('Approve', 'Reject', 'Abstain'),
    allowNull: false
  },
  claimed: {
    type: BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'has claimed locked token or not'
  },
  claimedTx: {
    type: STRING(255),
    allowNull: false,
    defaultValue: 'none',
    comment: 'claimed transaction'
  },
  proposalType: {
    type: ENUM(
      proposalTypes.PARLIAMENT,
      proposalTypes.REFERENDUM,
      proposalTypes.ASSOCIATION
    ),
    allowNull: false,
    field: 'proposal_type',
    comment: 'audit model of proposal'
  },
  time: {
    type: DATE,
    allowNull: false,
    defaultValue: NOW
  }
};

class Votes extends Model {
  static async personalVoteHistory(voter, proposalType, proposalId) {
    return Votes.findAll({
      attributes: [
        'txId',
        'voter',
        'amount',
        'symbol',
        'action'
      ],
      where: {
        voter,
        proposalType,
        proposalId
      }
    });
  }

  static voteHistory(proposalType, proposalId, pageSize, pre) {
    let whereCondition = {
      proposalType,
      proposalId
    };
    if (pre) {
      whereCondition = {
        ...whereCondition,
        id: {
          [Op.lt]: pre
        }
      };
    }
    return Votes.findAll({
      attributes: [
        'txId',
        'voter',
        'amount',
        'symbol',
        'action'
      ],
      where: whereCondition,
      limit: pageSize,
    });
  }

  static async hasVoted(voter, proposalType, proposalIds = []) {
    const result = await Votes.findAll({
      attributes: ['proposalId', 'action'],
      where: {
        voter,
        proposalType
      }
    });
    result.reduce((acc, item) => {
      const { proposalId, action } = item;
      if (proposalIds.includes(proposalId)) {
        return {
          ...acc,
          [proposalId]: action
        };
      }
      return acc;
    }, {});
  }
}

Votes.init(votesDescription, {
  ...commonModelOptions,
  tableName: 'votes'
});

module.exports = {
  Votes,
  votesDescription
};
