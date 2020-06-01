module.exports = {
  up: async queryInterface => {
    // add constraint
    await queryInterface.addConstraint('votes', ['tx_id', 'proposal_id'], {
      type: 'unique',
      name: 'tx_proposal'
    });
    await queryInterface.addIndex(
      'balance',
      {
        unique: true,
        fields: [
          {
            attribute: 'owner'
          },
          {
            attribute: 'symbol'
          }
        ],
        name: 'owner_symbol'
      }
    );
  },
  down: async queryInterface => {
    await queryInterface.removeConstraint('votes', 'tx_proposal');
    await queryInterface.removeIndex('balance', 'owner_symbol');
  }
};
