/* Legacy Modules */
const express = require('express');
const aws = require('aws-sdk');
const mongodb = require('mongodb');


/* Import Services */
const auth = require('@services/Authorization');
const logService = require('@services/LogService');

/* Import Utils */
const debugLog = require('@utils/DebugLogger');


/* Custom Variables */
const {
  uploadSuffix,
  infoDB,
  logDB
} = require('@models/CustomVariables');


/* Module Pre-Init */
const router = express.Router();
const s3 = new aws.S3();


/* Routes */

// Verify JWT
router.get('/verifyToken', (req, res) => {
  const logger = req.app.get('db').collection(logDB);

  logService.addLog('Token verified', 'Admin', req.get('Authorization'), logger);

  if (auth.verifyToken(req.get('Authorization'))) {
    debugLog.info('JWT is valid');
    res.status(200).send('Valid');
  }
  else {
    debugLog.info('JWT is invalid');
    res.ststus(200).send('Invalid');
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
  if (auth.checkHighAuth()) {
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
    res.status(401).send('Couldn\'t authenticate connection');
  }
});

// Report Audit View
router.get('/audit', (req, res) => {
  if (auth.checkHighAuth()) {
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
    res.status(401).send('Couldn\'t authenticate connection');
  }
});

// Document Report Freeing Route
router.post('/free/:id', (req, res) => {
  const info = req.app.get('db').collection(infoDB);
  const logger = req.app.get('db').collection(logDB);

  if (auth.checkHighAuth()) {
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

          logService.addLog('Token verified', 'Admin', req.get('Authorization'), logger);

          res.redirect(`${req.baseUrl}/audit`);
        }
      }
    );
  }
  else {
    debugLog.error('Authentication Failure');
    res.status(401).send('Couldn\'t authenticate connection');
  }
});




// Document Delete Route
router.post('/delete/:id', (req, res) => {
  const info = req.app.get('db').collection(infoDB);
  const logger = req.app.get('db').collection(logDB);

  if (auth.checkHighAuth()) {
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
        res.redirect(`${req.baseUrl}/view`);
      }
    });
  }
  else {
    debugLog.error('Authentication Failure');
    res.status(401).send('Couldn\'t authenticate connection');
  }
});

// Login Controller
router.post('/login', (req, res) => {
  const info = req.app.get('db').collection(infoDB);

  info.find({
    email: req.body.email,
    password: req.body.password
  });
});


/* Module Exports */
module.exports = router;
