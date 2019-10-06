/* Legacy Modules */
const express = require('express');
const aws = require('aws-sdk');
const mongodb = require('mongodb');


/* Import Services */
const auth = require('services/Authorization');
const logService = require('services/LogService');
const mongoService = require('services/MongoService');
const mailer = require('services/MailService');


/* Import Utils */
const debugLog = require('utils/DebugLogger');


/* Custom Options */
const Options = require('models/Options');


/* Custom Variables */
const {
  uploadSuffix,
  infoDB,
  logDB,
  adminCreds
} = require('models/CustomVariables');


/* Module Pre-Init */
const router = express.Router();
const s3 = new aws.S3();


/* Routes */

// Verify JWT
router.get('/verifyToken', (req, res) => {
  if (auth.checkHighAuth(req)) {
    const logger = req.app.get('db').collection(logDB);

    logService.addLog('Token verified', 'Admin', req.get('Authorization'), logger);

    if (auth.verifyToken(req.get('Authorization'))) {
      debugLog.info('JWT is valid');
      res.status(200).send('Valid');
    }
    else {
      debugLog.info('JWT is invalid');
      res.status(200).send('Invalid');
    }
  }
  else {
    debugLog.error('Authentication Failure');
    res.status(401).redirect('/admin/login');
  }
});

// Login View
router.get('/login', (req, res) => {
  res.render('login', null);
});

// Landing View
router.get('/', (req, res) => {
  if (auth.checkHighAuth(req)) {
    res.render('index', null);
  }
  else {
    debugLog.error('Authentication Failure');
    res.status(401).redirect('/admin/login');
  }
});

// Document List View
router.get('/view', (req, res) => {
  if (auth.checkHighAuth(req)) {
    const info = req.app.get('db').collection(infoDB);

    info.find({}).sort({ 'Counts.DownloadCount': -1, 'Counts.CallCount': -1, _id: 1 }).toArray((err, result) => {
      if (err) {
        debugLog.error('Can\'t run query', err);
        res.status(500).send(err);
      }
      else if (!result.length) {
        res.render('view', null);
      }
      else {
        res.render('view', {
          view: result
        });
      }
    });
  }
  else {
    debugLog.error('Authentication Failure');
    res.status(401).redirect('/admin/login');
  }
});

// Report Audit View
router.get('/audit', (req, res) => {
  if (auth.checkHighAuth(req)) {
    const info = req.app.get('db').collection(infoDB);

    info.find({ isReported: true }).sort({ 'Counts.DownloadCount': -1, 'Counts.CallCount': -1, _id: 1 }).toArray((err, result) => {
      if (err) {
        debugLog.error('Can\'t run query', err);
        res.status(500).send(err);
      }
      else if (!result.length) {
        res.render('audit', null);
      }
      else {
        res.render('audit', {
          view: result
        });
      }
    });
  }
  else {
    debugLog.error('Authentication Failure');
    res.status(401).redirect('/admin/login');
  }
});

// Forgot Password
router.post('/forgotPassword', (req, res) => {
  const logger = req.app.get('db').collection(logDB);

  if (req.body.email !== undefined) {
    const expectUser = adminCreds.filter(cred => cred.EMail === req.body.email);

    if (expectUser[0] !== undefined) {
      mailer.sendMail(res, expectUser[0], (err) => {
        if (err) {
          debugLog.error('Send Failure', err);
          res.render('login', {
            severity: 'error',
            message: 'There was some error. Please try again later.'
          });
        }
        else {
          res.render('login', {
            severity: 'success',
            message: 'Password sent to specified Email'
          });
          logService.addLog('Admin password dispatched', 'Admin', req.body.email, logger);
        }
      });
    }
    else {
      res.render('login', {
        severity: 'error',
        message: 'Invalid Email'
      });
    }
  }
  else {
    res.render('login', {
      severity: 'error',
      message: 'Required fields left unfilled'
    });
  }
});

// Logout Admin
router.post('/logout', (req, res) => {
  const logger = req.app.get('db').collection(logDB);

  if (req.signedCookies.authCert !== undefined) {
    logService.addLog('Admin logged out', 'Admin', JSON.parse(req.signedCookies.authCert).userid, logger);
    res.clearCookie('authCert').redirect('/admin/login');
  }
  else {
    res.render('login', {
      severity: 'error',
      message: 'Session Invalid'
    });
  }
});

// Handle File Audit
router.post('/audit/:id', (req, res) => {
  if (auth.checkHighAuth(req)) {
    if (req.body.result === 'unflag') {
      req.url = `/free/${req.params.id}`;
      router.handle(req, res);
    }
    if (req.body.result === 'delete') {
      req.url = `/delete/${req.params.id}`;
      router.handle(req, res);
    }
  }
  else {
    debugLog.error('Authentication Failure');
    res.status(401).redirect('/admin/login');
  }
});

// Document Report Freeing Route
router.post('/free/:id', (req, res) => {
  const info = req.app.get('db').collection(infoDB);
  const logger = req.app.get('db').collection(logDB);

  if (auth.checkHighAuth(req)) {
    info.findOneAndUpdate(
      { _id: new mongodb.ObjectId(req.params.id) },
      { $set: { isReported: false } },
      (err) => {
        if (err) {
          debugLog.error('Can\'t run query', err);
          res.status(500).send(err);
        }
        else {
          debugLog.info('Freed document from report');

          logService.addLog('Document freed', 'Admin', req.params.id, logger);

          res.status(200).redirect('/admin/audit');
        }
      }
    );
  }
  else {
    debugLog.error('Authentication Failure');
    res.status(401).redirect('/admin/login');
  }
});

// Document Delete Route
router.post('/delete/:id', (req, res) => {
  const info = req.app.get('db').collection(infoDB);
  const logger = req.app.get('db').collection(logDB);

  if (auth.checkHighAuth(req)) {
    info.findOneAndDelete({ _id: new mongodb.ObjectId(req.params.id) }, (err, doc) => {
      if (err) {
        debugLog.error('Can\'t run query', err);
        res.status(500).send(err);
      }
      else if (!doc.value) {
        debugLog.error('Detected multiclick', 'Ignoring multi-deletes');
      }
      else {
        debugLog.info('Removed document from database');

        logService.addLog('Deleted document', 'Admin', req.params.id, logger);

        s3.deleteObject({ Bucket: process.env.S3_STORAGE_BUCKET_NAME, Key: uploadSuffix + doc.value.DownloadURL.replace(/^.+\//g, '') }, (delerr) => {
          if (delerr) {
            debugLog.error('Error occured in deleting from bucket. Try manually removing the object', delerr);
            res.status(500).send(delerr);
          }
          else {
            debugLog.success('Deleted file : ', doc.value.DownloadURL.replace(/^.+\//g, ''));
          }
        });
        res.status(200).redirect(req.header('Referer') || '/admin/view');
      }
    });
  }
  else {
    debugLog.error('Authentication Failure');
    res.status(401).redirect('/admin/login');
  }
});

// Flush All Route
router.post('/flush', (req, res) => {
  const info = req.app.get('db').collection(infoDB);
  const logger = req.app.get('db').collection(logDB);

  if (auth.checkHighAuth(req)) {
    mongoService.findManyAndDelete(info, {}, (err, files) => {
      if (err) {
        debugLog.error('Can\'t run query', err);
      }
      else {
        debugLog.info('Flushed all documents');

        logService.addLog('Flushed database', 'Super-Admin', req.get('Authorization'), logger);

        files.forEach((doc) => {
          s3.deleteObject({ Bucket: process.env.S3_STORAGE_BUCKET_NAME, Key: uploadSuffix + doc.DownloadURL.replace(/^.+\//g, '') }, (delErr) => {
            if (delErr) {
              debugLog.error('Error occured in deleting from bucket. Try manually removing the object', delErr);
            }
            else {
              debugLog.success('Deleted file : ', doc.DownloadURL.replace(/^.+\//g, ''));
            }
          });
        });
        res.status(200).redirect(req.header('Referer') || '/admin/view');
      }
      return true;
    });
  }
  else {
    debugLog.error('Authentication Failure');
    res.status(401).redirect('/admin/login');
  }
});

// Login Controller
router.post('/login', (req, res) => {
  const logger = req.app.get('db').collection(logDB);

  if (req.body.userid !== undefined && req.body.password !== undefined) {
    const expectUser = adminCreds.filter(cred => cred.UserId === req.body.userid);

    if (expectUser[0] !== undefined && expectUser[0].Password === req.body.password) {
      if (req.body.staySigned === 'on') Options.cookieOptions.maxAge = 100 * 1571 * 1613 * 1000 * 1000;
      res.cookie('authCert',
        `{"userid":"${expectUser[0].UserId}","email":"${expectUser[0].EMail}"}`,
        Options.cookieOptions);
      res.cookie('activeUser', expectUser[0].UserId);
      res.redirect('/admin');
      logService.addLog('Admin logged in', 'Admin', req.body.userid, logger);
    }
    else {
      res.render('login', {
        severity: 'error',
        message: 'Invalid credentials'
      });
    }
  }
  else {
    res.render('login', {
      severity: 'error',
      message: 'Required fields left unfilled'
    });
  }
});


/* Module Exports */
module.exports = router;
