/* Import Utils */
const debugLog = require('@utils/DebugLogger');


/* Functions */

// Activity Logging
const addLog = (action, clearance, desc, db) => {
  const feed = {
    Action: action,
    Clearance: clearance,
    Description: desc,
    Timestamp: Date.now()
  };

  db.insertOne(feed, (err) => {
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
