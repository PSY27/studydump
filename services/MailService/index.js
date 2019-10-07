/* Functions */

// Send Mail
const sendResetMail = (app, user, cb) => {
  app.mailer.send('emails/resetpass', {
    to: user.EMail,
    subject: 'studyDump Admin Password Recovery',
    targetUser: user.UserId,
    targetPass: user.Password
  }, (err) => {
    cb(err);
  });
};

const sendSignupMail = (app, email, cb) => {
  app.mailer.send('emails/newsignup', {
    to: email,
    subject: 'Welcome to the studyDump Family',
    targetUser: email
  }, (err) => {
    cb(err);
  });
};

/* Module Exports */
module.exports = {
  sendResetMail,
  sendSignupMail
};
