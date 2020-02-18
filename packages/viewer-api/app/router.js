/**
 * @file router
 * @author atom-yang
 */

module.exports = app => {
  const {
    router,
    controller
  } = app;
  const audit = app.middleware.audit({ expired: 300 });

  router.get('/api/viewer/initCsrfToken', controller.initCsrfToken.initToken);
  router.get('/api/viewer/list', controller.list.getList);
  router.get('/api/viewer/allContracts', controller.list.getAllContracts);
  router.get('/api/viewer/history', controller.history.getHistory);
  router.get('/api/viewer/getFile', controller.file.getFile);
  router.get('/api/proposal/list', audit, controller.proposals.getList);
  router.get('/api/proposal/params', controller.proposals.getParam);
  router.get('/api/proposal/tokenList', controller.proposals.getTokenList);
  router.get('/api/proposal/checkContractName', audit, controller.proposals.checkContractName);
  router.post('/api/proposal/addContractName', audit, controller.proposals.addContractName);
  router.get('/api/proposal/auditOrganizations', controller.organizations.getAuditList);
  router.get('/api/proposal/organizations', controller.organizations.getList);
  router.get('/api/proposal/votedList', controller.votes.getList);
  router.get('/api/proposal/personalVotedList', audit, controller.votes.getPersonalList);
};
