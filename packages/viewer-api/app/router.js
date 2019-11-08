/**
 * @file router
 * @author atom-yang
 */

module.exports = app => {
  const {
    router,
    controller
  } = app;
  router.get('/api/viewer/initCsrfToken', controller.initCsrfToken.initToken);
  router.get('/api/viewer/list', controller.list.getList);
  router.get('/api/viewer/history', controller.history.getHistory);
  router.get('/api/viewer/getFile', controller.file.getFile);
};
