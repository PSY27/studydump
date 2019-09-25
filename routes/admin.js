/* Legacy Modules */
const express = require('express');
const aws = require('aws-sdk');
const mongodb = require('mongodb');


/* Import Services */
const auth = require('@services/Authorization');
const logService = require('@services/LogService');

/* Import Utils */
const debugLog = require('@utils/DebugLogger');


/* Custom Options */
const Options = require('@models/Options');


/* Custom Variables */
const {
  uploadSuffix,
  infoDB,
  logDB,
  adminCreds
} = require('@models/CustomVariables');


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
    res.status(403).redirect('login');
  }
});

// Login View
router.get('/login', (req, res) => {
  res.render('login');
});

// Landing View
router.get('/', (req, res) => {
  res.render('index');
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
      else if (result.length) {
        res.render('view', {
          view: result
        });
      }
      else {
        debugLog.info('No documents found');
        res.status(200).send('No documents found');
      }
    });
  }
  else {
    debugLog.error('Authentication Failure');
    res.status(403).redirect('login');
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
      else {
        debugLog.info('Removed document from database');

        logService.addLog('Token verified', 'Admin', req.get('Authorization'), logger);

        s3.deleteObject({ Bucket: process.env.S3_STORAGE_BUCKET_NAME, Key: uploadSuffix + doc.value.DownloadURL.replace(/^.+\//g, '') }, (delerr) => {
          if (delerr) {
            debugLog.error('Error occured in deleting from bucket. Try manually removing the object', delerr);
            res.status(500).send(delerr);
          }
          else {
            debugLog.success('Deleted file : ', doc.value.DownloadURL.replace(/^.+\//g, ''));
          }
        });
        res.redirect('../view');
      }
    });
  }
  else {
    debugLog.error('Authentication Failure');
    res.status(403).redirect('login');
  }
});

// Login Controller
router.post('/login', (req, res) => {
  const logger = req.app.get('db').collection(logDB);

  if (req.body.userid !== undefined && req.body.password !== undefined) {
    const expectUser = adminCreds.filter(cred => cred.UserId === req.body.userid);

    if (expectUser[0] !== undefined && expectUser[0].Password === req.body.password) {
      res.cookie('authCert', 'value', Options.cookieOptions).redirect('view');
      logService.addLog('Admin Login', 'Admin', req.body.userid, logger);
    }
    else {
      res.render('login', {
        message: 'Invalid Credentials'
      });
    }
  }
  else {
    res.render('login', {
      message: 'Required Fields Left Unfilled'
    });
  }
});


/* Module Exports */
module.exports = router;
