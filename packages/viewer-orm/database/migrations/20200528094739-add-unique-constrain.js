module.exports = {
  up: async queryInterface => {
    // add constraint
    await queryInterface.addConstraint('votes', ['tx_id', 'proposal_id'], {
      type: 'unique',
      name: 'tx_proposal'
    });
  },
  down: async queryInterface => {
    await queryInterface.removeConstraint('votes', 'tx_proposal');
  }
};
