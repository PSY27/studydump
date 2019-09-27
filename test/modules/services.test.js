/* Legacy Modules */
const should = require('should');


/* Import Services */
const { pushNotif } = require('../../services/FCM');
const { addLog } = require('../../services/LogService');
const { init } = require('../../services/MongoService');
const {
  createToken,
  resolveToken,
  checkHighAuth,
  verifyToken
} = require('../../services/Authorization');


/* Import Utils */
const debugLog = require('../../utils/DebugLogger');


/* Unit Tests */

// Authorization
describe('Tokens', () => {
  context('Create Token', () => {
    it('Availability', () => {
      should(createToken).be.a.function;
    });

    it('Return Token', () => {
      should(createToken()).equals(undefined);
    });
  });
});
