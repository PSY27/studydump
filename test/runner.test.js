/* Import Utils */
const debugLog = require('../utils/DebugLogger');


/* Common Tests */
const common = require('./common');


/* Module Tests */
describe('::::MODULE TESTS::::\n', () => {
  describe('UTILS', () => {
    require('./modules/utils.test.js');
  });

  // describe('SERVICES', () => {
  //   require('./services.test.js');
  // });
  //
  // describe('ROUTES', () => {
  //   require('./routes.test.js');
  // });
  //
  // describe('SERVICES', () => {
  //   require('./services.test.js');
  // });

  after(() => {
    debugLog.success('ALL TESTS COMPLETED!', '', 2);
  });
});
