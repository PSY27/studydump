/* Legacy Modules */
const jwt = require('jsonwebtoken');


/* Import Utils */
const debugLog = require('@utils/DebugLogger');


/* Module Pre-Init */
const JWTPrivateKEY = process.env.JWT_PRIVATE_KEY;
const JWTPublicKEY = process.env.JWT_PUBLIC_KEY;
const JWTSignOptions = JSON.parse(process.env.JWT_SIGN_OPTIONS);


/* Functions */

// Create Token
const createToken = (payload) => {
  const token = jwt.sign(payload, JWTPrivateKEY, JWTSignOptions);
  debugLog.info('Token : ', token);
  return token;
};

// Resolve JWT Token
const resolveToken = (feed) => {
  if (feed.startsWith('Bearer')) {
    return feed.split(' ')[1];
  }
  return feed;
};

// Authenticate JWT
const verifyToken = (feedToken) => {
  try {
    if (!feedToken) throw new Error();
  }
  catch (err) {
    debugLog.error('No token provided with call');
    return false;
  }

  const token = resolveToken(feedToken);

  try {
    jwt.verify(token, JWTPublicKEY, JWTSignOptions, (err, decoded) => {
      if (decoded) {
        debugLog.success('Token authorized');
      }
      else {
        throw err;
      }
    });
    return true;
  }
  catch (err) {
    debugLog.error('Couldn\'t authenticate token');
    return false;
  }
};

// High Auth Check
const checkHighAuth = () => true;
/* Elaborate Here */

/* -------------- */

// Admin Login


/* Module Exports */
module.exports = {
  createToken,
  resolveToken,
  checkHighAuth,
  verifyToken
};
