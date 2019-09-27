/* Legacy Modules */
const FCM = require('fcm-push');


/* Import Utils */
const debugLog = require('utils/DebugLogger');


/* Messaging Setup */
const fcm = new FCM(process.env.FCM_WEB_API_TOKEN);


/* Functions */

// FCM Service
const pushNotif = (topic, titleString, bodyString) => {
  var message = {
    to: `/topics/${topic}`,
    notification: {
      title: titleString,
      body: bodyString
    }
  };

  fcm.send(message)
    .then((response) => {
      debugLog.success('Successfully sent with response: ', response);
    })
    .catch((err) => {
      debugLog.error('Notification wasn\'t pushed', err);
    });
};


/* Module Exports */
module.exports = {
  pushNotif
};
