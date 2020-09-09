/**
 * @file organization related formatters
 * @author atom-yang
 */
const Decimal = require('decimal.js');
const lodash = require('lodash');
const {
  Proposers
} = require('viewer-orm/model/proposers');
const {
  sequelize
} = require('viewer-orm/common/viewer');
const {
  Organizations
} = require('viewer-orm/model/organizations');
const {
  Tokens
} = require('viewer-orm/model/tokens');
const {
  Members
} = require('viewer-orm/model/members');
const {
  deserializeLogs
} = require('../utils');
const config = require('../config');

async function organizationCreatedFormatter(transaction) {
  const {
    Logs = [],
    TransactionId,
    Transaction,
    time
  } = transaction;
  const {
    From
  } = Transaction;
  const logResults = await deserializeLogs(Logs, 'OrganizationCreated');
  return Promise.all(logResults.map(log => {
    const {
      deserializeLogResult,
      contractAddress
    } = log;
    const {
      organizationAddress
    } = deserializeLogResult;
    const proposalType = config.constants.addressProposalTypesMap[contractAddress];
    return config.contracts[proposalType.toLowerCase()]
      .contract.GetOrganization.call(organizationAddress)
      .then(org => {
        const {
          organizationAddress: orgAddress,
          organizationHash: orgHash,
          proposalReleaseThreshold: releaseThreshold,
          ...leftOrgInfo
        } = org;
        return {
          orgAddress,
          orgHash,
          releaseThreshold,
          leftOrgInfo,
          createdAt: time,
          proposalType,
          creator: From,
          txId: TransactionId
        };
      });
  }));
}

async function organizationCreatedInserter(formattedData) {
  return sequelize.transaction(t => Promise.all(formattedData.map(async item => {
    // eslint-disable-next-line prefer-const
    const {
      orgAddress,
      proposalType,
      leftOrgInfo,
      txId
    } = item;
    const isExist = await Organizations.isExist(orgAddress);
    if (isExist) {
      return false;
    }
    if (proposalType !== config.constants.proposalTypes.PARLIAMENT) {
      let { releaseThreshold } = item;
      if (proposalType === config.constants.proposalTypes.REFERENDUM) {
        const { tokenSymbol } = leftOrgInfo;
        const decimal = await Tokens.getTokenDecimal(tokenSymbol);
        releaseThreshold = Object.entries(releaseThreshold).reduce((acc, [key, value]) => ({
          ...acc,
          [key]: new Decimal(value).dividedBy(`1e${decimal}`)
        }), {});
      }
      const {
        proposerWhiteList
      } = leftOrgInfo;
      let {
        proposers
      } = proposerWhiteList;
      proposers = proposers.map(v => ({
        orgAddress,
        proposer: v,
        proposalType,
        relatedTxId: txId
      }));
      if (proposalType === config.constants.proposalTypes.ASSOCIATION) {
        const {
          organizationMemberList = {}
        } = leftOrgInfo;
        const {
          organizationMembers = []
        } = organizationMemberList;
        return Promise.all([
          Organizations.findOrCreate({
            where: {
              orgAddress: item.orgAddress
            },
            defaults: {
              ...item,
              releaseThreshold
            },
            transaction: t
          }),
          Proposers.bulkCreate(proposers, {
            transaction: t,
            updateOnDuplicate: Object.keys(Proposers.tableAttributes).filter(v => v !== 'id')
          }),
          Members.bulkCreate((organizationMembers || []).map(v => ({
            member: v,
            orgAddress
          })), {
            transaction: t,
            updateOnDuplicate: Object.keys(Members.tableAttributes).filter(v => v !== 'id')
          })
        ]);
      }
      return Promise.all([
        Organizations.findOrCreate({
          where: {
            orgAddress: item.orgAddress
          },
          defaults: {
            ...item,
            releaseThreshold
          },
          transaction: t
        }),
        Proposers.bulkCreate(proposers, {
          transaction: t,
          updateOnDuplicate: Object.keys(Proposers.tableAttributes).filter(v => v !== 'id')
        })
      ]);
    }
    return Organizations.findOrCreate({
      where: {
        orgAddress: item.orgAddress
      },
      defaults: item,
      transaction: t
    });
  })));
}

async function organizationCreatedInsert(transaction) {
  const formattedData = await organizationCreatedFormatter(transaction);
  return organizationCreatedInserter(formattedData);
}


async function organizationUpdatedInsert(transaction) {
  const {
    Logs = [],
    TransactionId,
    time
  } = transaction;
  const logResults = [
    ...(await deserializeLogs(Logs, 'OrganizationWhiteListChanged')),
    ...(await deserializeLogs(Logs, 'OrganizationThresholdChanged'))
  ];
  return sequelize.transaction(t => Promise.all(logResults.map(async log => {
    const {
      contractAddress,
      deserializeLogResult,
      name
    } = log;
    const {
      organizationAddress
    } = deserializeLogResult;
    const proposalType = config.constants.addressProposalTypesMap[contractAddress];
    const { contract } = config.contracts[proposalType.toLowerCase()];
    const orgInfo = await contract.GetOrganization.call(organizationAddress);
    const {
      organizationAddress: orgAddress,
      organizationHash: orgHash,
      proposalReleaseThreshold,
      ...leftOrgInfo
    } = orgInfo;

    let releaseThreshold = proposalReleaseThreshold;
    if (proposalType === config.constants.proposalTypes.REFERENDUM) {
      const { tokenSymbol } = leftOrgInfo;
      const decimal = await Tokens.getTokenDecimal(tokenSymbol);
      releaseThreshold = Object.entries(releaseThreshold).reduce((acc, [key, value]) => ({
        ...acc,
        [key]: new Decimal(value).dividedBy(`1e${decimal}`)
      }), {});
    }

    if (name === 'OrganizationWhiteListChanged' && proposalType !== config.constants.proposalTypes.PARLIAMENT) {
      const {
        proposerWhiteList = {
          proposers: []
        }
      } = deserializeLogResult;
      const proposers = proposerWhiteList.proposers.map(v => ({
        orgAddress,
        proposer: v,
        proposalType,
        relatedTxId: TransactionId
      }));
      // 不可在事务中删除
      await Proposers.destroy({
        where: {
          orgAddress
        }
      });
      return Promise.all([
        Organizations.update({
          orgHash,
          releaseThreshold,
          leftOrgInfo,
          updatedAt: time
        }, {
          where: {
            orgAddress
          },
          transaction: t
        }),
        Proposers.bulkCreate(proposers, {
          transaction: t,
          updateOnDuplicate: Object.keys(Proposers.tableAttributes).filter(v => v !== 'id')
        })
      ]);
    }
    return Organizations.update({
      orgHash,
      releaseThreshold,
      leftOrgInfo,
      updatedAt: time
    }, {
      where: {
        orgAddress
      },
      transaction: t
    });
  })));
}

async function organizationMemberChangedFormatter(transaction) {
  const {
    Logs = [],
    time
  } = transaction;
  const [
    memberAdded,
    memberRemoved,
    memberChanged
  ] = await Promise.all([
    deserializeLogs(Logs, 'MemberAdded'),
    deserializeLogs(Logs, 'MemberRemoved'),
    deserializeLogs(Logs, 'MemberChanged'),
  ]);
  const list = lodash.uniq([
    ...memberAdded,
    ...memberRemoved,
    ...memberChanged
  ].map(log => {
    const {
      contractAddress,
      deserializeLogResult
    } = log;
    const {
      organizationAddress
    } = deserializeLogResult;
    const proposalType = config.constants.addressProposalTypesMap[contractAddress];
    return `${proposalType}_${organizationAddress}`;
  }));
  return Promise.all(list.map(async item => {
    const [proposalType, orgAddress] = item.split('_');
    const { contract } = config.contracts[proposalType.toLowerCase()];
    return {
      ...(await contract.GetOrganization.call(orgAddress)),
      time
    };
  }));
}

async function organizationMemberChangedInserter(transaction) {
  const formattedData = await organizationMemberChangedFormatter(transaction);
  return sequelize.transaction(t => Promise.all(formattedData.map(async orgInfo => {
    const {
      organizationAddress: orgAddress,
      organizationHash: orgHash,
      proposalReleaseThreshold: releaseThreshold,
      time,
      ...leftOrgInfo
    } = orgInfo;
    const {
      organizationMemberList = {}
    } = leftOrgInfo;
    const {
      organizationMembers = []
    } = organizationMemberList;
    const members = (organizationMembers || []).map(v => ({
      member: v,
      orgAddress
    }));
    // 不可在事务中删除
    await Members.destroy({
      where: {
        orgAddress
      }
    });
    return Promise.all([
      Organizations.update({
        orgHash,
        releaseThreshold,
        leftOrgInfo,
        updatedAt: time
      }, {
        where: {
          orgAddress
        },
        transaction: t
      }),
      Members.bulkCreate(members, {
        transaction: t,
        updateOnDuplicate: Object.keys(Members.tableAttributes).filter(v => v !== 'id')
      })
    ]);
  })));
}

module.exports = {
  organizationCreatedInsert,
  organizationUpdatedInsert,
  organizationCreatedInserter,
  organizationMemberChangedInserter
};
