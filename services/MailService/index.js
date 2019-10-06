/* Functions */

// Send Mail
const sendMail = (app, user, cb) => {
  app.mailer.send('emails/resetpass', {
    to: user.EMail,
    subject: 'studyDump Admin Password Recovery',
    targetUser: user.UserId,
    targetPass: user.Password
  }, (err) => {
    cb(err);
  });
};

/* Module Exports */
module.exports = {
  sendMail
};
