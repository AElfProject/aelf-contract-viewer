/**
 * @file votes model
 * @author atom-yang
 */
const Sequelize = require('sequelize');
const { commonModelOptions } = require('../common/viewer');
const config = require('../config');

const {
  constants: {
    proposalTypes,
    proposalActions
  }
} = config;

const {
  Model,
  BIGINT,
  DECIMAL,
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
    type: DECIMAL(64, 8),
    allowNull: false,
    defaultValue: 0,
  },
  symbol: {
    type: STRING(255),
    allowNull: false,
    defaultValue: 'none'
  },
  action: {
    type: ENUM(
      proposalActions.APPROVE,
      proposalActions.REJECT,
      proposalActions.ABSTAIN
    ),
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
  },
  claimedTime: {
    type: DATE,
    allowNull: false,
    defaultValue: NOW,
    field: 'claimed_time'
  }
};

class Votes extends Model {
  static async personalVoteHistory(voter, proposalId) {
    return Votes.findAll({
      attributes: [
        'txId',
        'voter',
        'amount',
        'symbol',
        'action',
        'time',
        'claimed',
        'claimedTx',
        'claimedTime'
      ],
      where: {
        voter,
        proposalId
      },
      order: [
        ['id', 'DESC']
      ],
    });
  }

  static async voteHistory(proposalId, pageSize, pageNum, search) {
    let whereCondition = {
      proposalId
    };
    if (search) {
      whereCondition = {
        ...whereCondition,
        [Op.or]: [
          {
            voter: {
              [Op.substring]: search
            }
          },
          {
            txId: {
              [Op.substring]: search
            }
          },
        ]
      };
    }
    const result = await Votes.findAndCountAll({
      attributes: [
        'txId',
        'voter',
        'amount',
        'symbol',
        'action',
        'time'
      ],
      order: [
        ['id', 'DESC']
      ],
      where: whereCondition,
      limit: pageSize,
      offset: (pageNum - 1) * pageSize
    });
    const total = result.count;
    const list = result.rows.map(v => v.toJSON());
    return {
      total,
      list
    };
  }

  static async hasVoted(voter, proposalType, proposalIds = []) {
    const result = await Votes.findAll({
      attributes: ['proposalId', 'action'],
      where: {
        voter,
        proposalType
      }
    });
    return result.reduce((acc, item) => {
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
