/* Legacy Modules */
const express = require('express');
const aws = require('aws-sdk');
const mongodb = require('mongodb');


/* Import Services */
const auth = require('services/Authorization');
const logService = require('services/LogService');
const mongoService = require('services/MongoService');


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
    res.status(401).redirect('login');
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
    res.status(401).redirect('login');
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
      else if (result.length) {
        res.render('audit', {
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
    res.status(401).redirect('login');
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

          res.redirect('audit');
        }
      }
    );
  }
  else {
    debugLog.error('Authentication Failure');
    res.status(401).redirect('login');
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
        debugLog.error('Detected Multiclick', 'Ignoring multi-deletes');
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
        res.redirect(req.header('Referer') || 'view');
      }
    });
  }
  else {
    debugLog.error('Authentication Failure');
    res.status(401).redirect('login');
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
        res.redirect(req.header('Referer') || 'view');
      }
      return true;
    });
  }
  else {
    debugLog.error('Authentication Failure');
    res.status(401).redirect('login');
  }
});

// Login Controller
router.post('/login', (req, res) => {
  const logger = req.app.get('db').collection(logDB);

  if (req.body.userid !== undefined && req.body.password !== undefined) {
    const expectUser = adminCreds.filter(cred => cred.UserId === req.body.userid);

    if (expectUser[0] !== undefined && expectUser[0].Password === req.body.password) {
      res.cookie('authCert', 'value', Options.cookieOptions).redirect('view');
      logService.addLog('Admin logged in', 'Admin', req.body.userid, logger);
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
