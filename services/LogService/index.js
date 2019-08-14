/* Import Utils */
const debugLog = require('../../utils/DebugLogger');


/* Functions */

// Activity Logging
const addLog = (action, desc, db) => {
  const feed = { Action: action, Description: desc, Timestamp: Date.now() };

  db.insert(feed, (err) => {
    if (err) {
      debugLog.error('Can\'t insert into database', err);
    }
    else {
      debugLog.success('Inserted into database');
    }
  });
};


/* Module Exports */
module.exports = {
  addLog
};
