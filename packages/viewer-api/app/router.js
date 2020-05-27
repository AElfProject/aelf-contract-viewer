/**
 * @file router
 * @author atom-yang
 */

module.exports = app => {
  const {
    router,
    controller
  } = app;
  const audit = app.middleware.audit({ expired: 300 * 1000 });

  router.get('/api/viewer/initCsrfToken', controller.initCsrfToken.initToken);
  router.get('/api/viewer/list', controller.list.getList);

  router.get('/api/viewer/allContracts', controller.list.getAllContracts);
  router.get('/api/viewer/getContractName', controller.list.getContractName);

  router.get('/api/viewer/history', controller.history.getHistory);
  router.get('/api/viewer/getFile', controller.file.getFile);

  router.get('/api/viewer/accountList', controller.account.getAccountListBySymbol);
  router.get('/api/viewer/balances', controller.account.getBalancesByAddress);

  router.get('/api/proposal/list', audit, controller.proposals.getList);
  router.get('/api/proposal/appliedList', controller.proposals.appliedProposal);
  router.get('/api/proposal/proposalInfo', audit, controller.proposals.getProposalById);
  router.get('/api/proposal/tokenList', controller.proposals.getTokenList);

  router.get('/api/proposal/checkContractName', audit, controller.proposals.checkContractName);
  router.post('/api/proposal/addContractName', audit, controller.proposals.addContractName);

  router.get('/api/proposal/auditOrganizations', controller.organizations.getAuditList);
  router.get('/api/proposal/auditOrganizationsByPage', controller.organizations.getAuditListByPage);
  router.get('/api/proposal/orgOfOwner', controller.organizations.getOrgOfOwner);
  router.get('/api/proposal/organizations', controller.organizations.getList);

  router.get('/api/proposal/votedList', controller.votes.getList);
  router.get('/api/proposal/personalVotedList', controller.votes.getPersonalList);
  router.get('/api/proposal/allPersonalVotes', controller.votes.getAllPersonalVotes);

  router.get('/api/viewer/getAllTokens', controller.tokens.getList);
  router.get('/api/viewer/eventList', controller.events.getList);
  router.get('/api/viewer/transferList', controller.transfer.getList);
  router.get('/api/viewer/tokenTxList', controller.tokens.getTransactionList);
};
