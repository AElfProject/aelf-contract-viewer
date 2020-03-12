/**
 * @file constants
 * @author atom-yang
 */
const AElf = require('aelf-sdk');
const config = require('../config');

const SCAN_TAGS = {
  ORGANIZATION_CREATED: 'ORGANIZATION_CREATED',
  PROPOSAL_CREATED: 'PROPOSAL_CREATED',
  PROPOSAL_VOTED: 'PROPOSAL_VOTED',
  PROPOSAL_RELEASED: 'PROPOSAL_RELEASED',
  ORGANIZATION_UPDATED: 'ORGANIZATION_UPDATED',
  PROPOSAL_CLAIMED: 'PROPOSAL_CLAIMED'
};

const listeners = [
  {
    checker(bloom) {
      return AElf.utils.isEventInBloom(bloom, 'OrganizationCreated');
    },
    tag: SCAN_TAGS.ORGANIZATION_CREATED
  },
  {
    checker(bloom) {
      return AElf.utils.isEventInBloom(bloom, 'ProposalCreated');
    },
    tag: SCAN_TAGS.PROPOSAL_CREATED
  },
  {
    checker(bloom) {
      return ((
        AElf.utils.isEventInBloom(bloom, 'ReferendumReceiptCreated')
        && AElf.utils.isAddressInBloom(bloom, config.contracts.referendum.address)
      ) || (
        AElf.utils.isEventInBloom(bloom, 'ReceiptCreated')
        && (AElf.utils.isAddressInBloom(bloom, config.contracts.parliament.address)
          || AElf.utils.isAddressInBloom(bloom, config.contracts.association.address)
        )
      ));
    },
    tag: SCAN_TAGS.PROPOSAL_VOTED
  },
  {
    checker(bloom) {
      return AElf.utils.isEventInBloom(bloom, 'ProposalReleased');
    },
    tag: SCAN_TAGS.PROPOSAL_RELEASED
  },
  {
    checker(bloom) {
      return AElf.utils.isEventInBloom(bloom, 'OrganizationWhiteListChanged')
        || AElf.utils.isEventInBloom(bloom, 'OrganizationMemberChanged')
        || AElf.utils.isEventInBloom(bloom, 'OrganizationThresholdChanged');
    },
    tag: SCAN_TAGS.ORGANIZATION_UPDATED
  }
];

// eslint-disable-next-line no-unused-vars
const claimed = {
  // todo: instead of using sql scan
  // list is the array of related referendum voters' address, passed by bind(null, list)
  checker(list, bloom) {
    return AElf.utils.isEventInBloom(bloom, 'Transferred')
      && list.map(item => Buffer.from(`12220a20${AElf.utils.decodeAddressRep(item)}`, 'hex').toString('base64'))
        .filter(indexed => AElf.utils.isIndexedInBloom(bloom, indexed)).length > 0;
  },
  tag: SCAN_TAGS.PROPOSAL_CLAIMED
};

module.exports = {
  SCAN_TAGS,
  listeners
};
