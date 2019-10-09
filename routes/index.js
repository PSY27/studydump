/* Legacy Modules */
const express = require('express');
const mongodb = require('mongodb');
const aws = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');


/* Import Core */
const thumbCore = require('core/Thumbnails');


/* Import Services */
const auth = require('services/Authorization');
const logService = require('services/LogService');
const { pushNotif } = require('services/FCM');


/* Import Utils */
const nundef = require('utils/NullUndef');
const metafetch = require('utils/MetaManip');
const debugLog = require('utils/DebugLogger');
require('utils/StringExtensions');


/* Custom Options */
const structURL = require('models/structure.json');
const Options = require('models/Options');


/* Custom Variables */
const {
  uploadSuffix,
  infoDB,
  timestampDB,
  logDB
} = require('models/CustomVariables');


/* Module Pre-Init */
const router = express.Router();

aws.config.update({
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  region: process.env.S3_STORAGE_BUCKET_REGION
});

const s3 = new aws.S3();

const storage = multerS3({
  s3,
  bucket: process.env.S3_STORAGE_BUCKET_NAME,
  acl: 'public-read',
  key(req, file, cb) {
    const FileName = `${file.originalname.substring(0, file.originalname.lastIndexOf('.')).sanitise().indentFix()}-${Date.now()}${file.originalname.substring(file.originalname.lastIndexOf('.'), file.originalname.length)}`;
    const UploadPath = uploadSuffix + FileName;
    cb(null, UploadPath);
  }
});

const upload = multer({
  storage,
  limits: Options.fileLimit
}).single('uploadFile');

const bulk = multer({
  storage,
  limits: Options.fileLimit
}).array('bulkUpload', 50);


/* Routes */

// Generate JWT
router.post('/getToken', (req, res) => {
  const logger = req.app.get('db').collection(logDB);

  if (req.body.name && req.body.email) {
    const payload = {
      name: req.body.name.sanitise(),
      email: req.body.email.sanitise()
    };

    const token = auth.createToken(payload);
    res.status(200).send(token);
    logService.addLog('Token generated', 'General User', token, logger);
  }
  else {
    res.status(500).send('Parameters not filled');
    logService.addLog('Empty token parameters', 'General User', token, logger);
  }
});

// Search Document Route
router.get('/search', (req, res) => {
  const info = req.app.get('db').collection(infoDB);

  if (auth.verifyToken(req.get('Authorization'))) {
    const queryArray = req.query.s.split(',');
    const sanitisedArray = queryArray.map(e => e.sanitise());
    const regex = sanitisedArray.map(e => new RegExp(`.*${e}.*`, 'i'));

    const feed = {};

    if (req.query.year) {
      feed['Filters.Year'] = req.query.year.sanitise().toNum();
    }
    if (req.query.branch) {
      feed['Filters.Branch'] = req.query.branch.sanitise().stringFix();
    }
    if (req.query.subject) {
      feed['Filters.Subject'] = req.query.subject.sanitise().stringFix();
    }
    if (req.query.available !== false) {
      feed.isAvailable = true;
    }

    info.find(
      {
        $and: [
          feed,
          {
            $or: [
              { FileName: { $in: regex } }
            ]
          }
        ]
      }
    ).sort({
      FileName: 1,
      'Counts.LikeCount': -1,
      'Counts.DownloadCount': -1,
      Size: -1,
      'Counts.CallCount': -1,
      _id: -1
    }).toArray((err, result) => {
      if (err) {
        debugLog.error('Collection couldn\'t be read', err);
        res.status(500).send(err);
      }
      else if (result.length) {
        // duplicate check
        debugLog.info('Found search result');
        res.status(200).send(result);
      }
      else {
        debugLog.info('No results found');
        res.status(200).send('No upload found');
      }
    });
  }
  else {
    debugLog.error('Authentication Failure');
    res.status(401).send('Couldn\'t authenticate connection');
  }
});

// Current App Version Return
router.get('/getVersion', (req, res) => {
  const logger = req.app.get('db').collection(logDB);

  if (auth.verifyToken(req.get('Authorization'))) {
    debugLog.info('Sending version');
    res.status(200).send(process.env.FRONTEND_VERSION);
    logService.addLog('Version sent', 'General User', `${req.query.appVersion}->${process.env.FRONTEND_VERSION}`, logger);
  }
  else {
    debugLog.error('Authentication Failure');
    res.status(401).send('Couldn\'t authenticate connection');
  }
});

// Return Structure JSON
router.get('/getStructure', (req, res) => {
  const logger = req.app.get('db').collection(logDB);

  if (auth.verifyToken(req.get('Authorization'))) {
    debugLog.info('Sending structure');
    res.status(200).json(structURL);
    logService.addLog('Structure called', 'General User', auth.resolveToken(req.get('Authorization')), logger);
  }
  else {
    debugLog.error('Authentication Failure');
    res.status(401).send('Couldn\'t authenticate connection');
  }
});

// Upload File Route
router.post('/uploadFile', (req, res) => {
  const info = req.app.get('db').collection(infoDB);
  const timestamp = req.app.get('db').collection(timestampDB);
  const logger = req.app.get('db').collection(logDB);

  if (auth.verifyToken(req.get('Authorization'))) {
    upload(req, res, (err) => {
      if (err) {
        debugLog.error('File couldn\'t be uploaded', err);
        res.status(500).send(err);
      }
      else if (!req.file) {
        debugLog.error('No file provided');
        res.status(500).send('No file was sent');
      }
      else {
        return info.find({
          $or: [
            {
              FileType: req.file.mimetype,
              Size: req.file.size,
              Filters: {
                Year: nundef.checkReturn(req.body.year, '0').sanitise().toNum(),
                Branch: nundef.checkReturn(req.body.branch, 'common').sanitise().stringFix(),
                Subject: nundef.checkReturn(req.body.subject, 'common').sanitise().stringFix()
              },
              IsNotif: nundef.checkReturn(req.body.notif, 'false')
            }
          ]
        }).toArray((findErr, result) => {
          if (findErr) {
            debugLog.error('Collection couldn\'t be read', findErr);
            res.status(500).send('Database is currently down!');
          }
          else if (result.length) {
            // duplicate check
            debugLog.warn('Duplicate document found');
            res.status(500).send('Duplicate Found');
          }
          else {
            debugLog.info('File uploaded successfully');

            if (nundef.checkReturn(req.body.notif, 'false') === 'true') {
              pushNotif(
                `${nundef.checkReturn(req.body.year, '0').sanitise().toNum()}_${nundef.checkReturn(req.body.branch, 'common').sanitise().stringFix()}`,
                `New Announcement: ${req.file.originalname}`,
                `${req.body.year}/${req.body.branch}`
              );
            }

            thumbCore.assignThumb(req.file).then((thumbObj) => {
              debugLog.info('Thumbnail generated at', thumbObj.thumbnail);

              const feed = {
                FileName: req.file.originalname,
                FileType: req.file.mimetype,
                Size: req.file.size,
                Filters: {
                  Year: nundef.checkReturn(req.body.year, '0').sanitise().toNum(),
                  Branch: nundef.checkReturn(req.body.branch, 'common').sanitise().stringFix(),
                  Subject: nundef.checkReturn(req.body.subject, 'common').sanitise().stringFix()
                },
                IsNotif: nundef.checkReturn(req.body.notif, 'false').sanitise().stringFix(),
                DownloadURL: req.file.location,
                ThumbnailURL: thumbObj.thumbnail,
                Counts: {
                  DownloadCount: 0,
                  CallCount: 0,
                  LikeCount: 0
                },
                isAvailable: true,
                isReported: false,
                uploadTime: Date.now()
              };

              info.insertOne(feed, (insertErr, insertResult) => {
                if (insertErr) {
                  debugLog.error('Can\'t insert into database', insertErr);
                  res.status(500).send(insertErr);
                }
                else {
                  debugLog.success('Inserted into database');
                  logService.addLog('File uploaded', 'General User', insertResult.ops[0]._id.toString(), logger);

                  const timec = Date.now();

                  const timefeed = {
                    Year: nundef.checkReturn(req.body.year, '0').sanitise().toNum(),
                    Branch: nundef.checkReturn(req.body.branch, 'common').sanitise().stringFix(),
                    Subject: nundef.checkReturn(req.body.subject, 'common').sanitise().stringFix()
                  };
                  timefeed.Notif = ((req.body.notif) === 'true');

                  timestamp.updateOne(timefeed,
                    { $set: { Timestamp: timec } },
                    { upsert: true }, (errTime) => {
                      if (err) {
                        debugLog.error('Can\'t update timestamp', errTime);
                        res.status(500).send(errTime);
                      }
                      else {
                        debugLog.info('Timestamp updated');
                        res.status(200).send('File uploaded');
                      }
                    });
                }
              });
            });
          }
        });
      }
      return true;
    });
  }
  else {
    debugLog.error('Authentication Failure');
    res.status(401).send('Couldn\'t authenticate connection');
  }
});

// Bulk Upload
router.post('/bulkUpload', (req, res) => {
  const info = req.app.get('db').collection(infoDB);
  const timestamp = req.app.get('db').collection(timestampDB);
  const logger = req.app.get('db').collection(logDB);

  if (auth.verifyToken(req.get('Authorization'))) {
    bulk(req, res, (err) => {
      if (err) {
        debugLog.error('File couldn\'t be uploaded', err);
        res.status(500).send(err);
      }
      else if (!req.files) {
        debugLog.error('No file provided');
        res.status(500).send('No file was sent');
      }
      else {
        return req.files.forEach((doc) => {
          info.find({
            $or: [
              {
                FileName: doc.originalname,
                FileType: doc.mimetype,
                Size: doc.size,
                Filters: {
                  Year: nundef.checkReturn(req.body.year, '0').sanitise().toNum(),
                  Branch: nundef.checkReturn(req.body.branch, 'common').sanitise().stringFix(),
                  Subject: nundef.checkReturn(req.body.subject, 'common').sanitise().stringFix()
                },
                IsNotif: nundef.checkReturn(req.body.notif, 'false')
              }
            ]
          }).toArray((findErr, result) => {
            if (findErr) {
              debugLog.error('Collection couldn\'t be read', findErr);
              res.status(500).send('Database is currently down!');
            }
            else if (result.length) {
              // duplicate check
              debugLog.warn('Duplicate document found');
              res.status(500).send('Duplicate Found');
            }
            else {
              debugLog.success('File uploaded successfully');

              if (nundef.checkReturn(req.body.notif, 'false') === 'true') {
                pushNotif(
                  `${nundef.checkReturn(req.body.year, '0').sanitise().toNum()}_${nundef.checkReturn(req.body.branch, 'common').sanitise().stringFix()}`,
                  `New Announcement: ${doc.originalname}`,
                  `${req.body.year}/${req.body.branch}`
                );
              }

              thumbCore.assignThumb(doc).then((thumbObj) => {
                debugLog.info('Thumbnail generated at', thumbObj.thumbnail);

                const feed = {
                  FileName: doc.originalname,
                  FileType: doc.mimetype,
                  Size: doc.size,
                  Filters: {
                    Year: nundef.checkReturn(req.body.year, '0').sanitise().toNum(),
                    Branch: nundef.checkReturn(req.body.branch, 'common').sanitise().stringFix(),
                    Subject: nundef.checkReturn(req.body.subject, 'common').sanitise().stringFix()
                  },
                  IsNotif: nundef.checkReturn(req.body.notif, 'false').sanitise().stringFix(),
                  DownloadURL: doc.location,
                  ThumbnailURL: thumbObj.thumbnail,
                  Counts: {
                    DownloadCount: 0,
                    CallCount: 0,
                    LikeCount: 0
                  },
                  isAvailable: true,
                  isReported: false,
                  uploadTime: Date.now()
                };

                info.insertOne(feed, (insertErr, insertResult) => {
                  if (insertErr) {
                    debugLog.error('Can\'t insert into database', insertErr);
                    res.status(500).send(insertErr);
                  }
                  else {
                    debugLog.success('Inserted into database');
                    logService.addLog('File uploaded', 'General User', insertResult.ops[0]._id.toString(), logger);

                    const timec = Date.now();

                    const timefeed = {
                      Year: nundef.checkReturn(req.body.year, '0').sanitise().toNum(),
                      Branch: nundef.checkReturn(req.body.branch, 'common').sanitise().stringFix(),
                      Subject: nundef.checkReturn(req.body.subject, 'common').sanitise().stringFix()
                    };
                    timefeed.Notif = ((req.body.notif) === 'true');

                    timestamp.updateOne(timefeed,
                      { $set: { Timestamp: timec } },
                      { upsert: true }, (errTime) => {
                        if (err) {
                          debugLog.error('Can\'t update timestamp', errTime);
                          res.status(500).send(errTime);
                        }
                        else {
                          debugLog.info('Timestamp updated');
                          res.status(200).send('Files uploaded');
                        }
                      });
                  }
                });
              });
            }
          });
        });
      }
      return true;
    });
  }
  else {
    debugLog.error('Authentication Failure');
    res.status(401).send('Couldn\'t authenticate connection');
  }
});

// List Uploads
router.get('/listUploads', (req, res) => {
  const info = req.app.get('db').collection(infoDB);
  const logger = req.app.get('db').collection(logDB);

  if (auth.verifyToken(req.get('Authorization'))) {
    const feed = {};

    if (req.query.year) {
      feed['Filters.Year'] = req.query.year.sanitise().toNum();
    }
    if (req.query.branch) {
      feed['Filters.Branch'] = req.query.branch.sanitise().stringFix();
    }
    if (req.query.subject) {
      feed['Filters.Subject'] = req.query.subject.sanitise().stringFix();
    }
    if (req.query.type) {
      feed.FileType = req.query.type.sanitise().stringFix().replace('.', '');
    }
    if (req.query.notif) {
      feed.IsNotif = (req.query.notif.sanitise().stringFix() === 'true') ? 'true' : 'false';
    }
    if (!req.query.report) {
      feed.isReported = false;
    }
    if (!req.query.available) {
      feed.isAvailable = true;
    }

    logService.addLog('Uploads list sent', 'General User', auth.resolveToken(req.get('Authorization')), logger);

    const query = info.find(feed).sort({
      'Counts.LikeCount': -1,
      'Counts.DownloadCount': -1,
      'Counts.CallCount': -1,
      _id: -1
    }).skip(
      req.query.page
        ? parseInt((req.query.page_size
          ? parseInt(req.query.page_size.sanitise().toNum(), 1)
          : 10
        ) * (req.query.page.sanitise().toNum() - 1), 10)
        : 0
    ).limit(
      (
        req.query.page_size
      )
        ? parseInt(
          req.query.page_size.sanitise().toNum(),
          10
        )
        : 10
    );

    query.toArray((errSet, resultSet) => {
      if (errSet) {
        debugLog.error('Collection couldn\'t be read', errSet);
        res.status(500).send(errSet);
      }
      else if (resultSet.length) {
        res.status(200).send(resultSet);
        resultSet.forEach((doc) => {
          info.updateMany({ _id: doc._id }, { $inc: { 'Counts.CallCount': 1 } }, (err) => {
            if (err) {
              debugLog.error('Query couldn\'t be executed', err);
            }
            else {
              debugLog.info('Call count updated');
              debugLog.info('Sending documents');
            }
          });
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

// Update Like Count
router.post('/updateLike', (req, res) => {
  if (auth.verifyToken(req.get('Authorization'))) {
    const info = req.app.get('db').collection(infoDB);
    const timestamp = req.app.get('db').collection(timestampDB);
    const logger = req.app.get('db').collection(logDB);

    if (!mongodb.ObjectId.isValid(req.body.id)) {
      debugLog.error('Invalid ObjectId supplied', req.body.id);
      res.status(500).send('Invalid ObjectId');
    }
    else {
      info.findAndModify(
        { _id: new mongodb.ObjectID(req.body.id) },
        {},
        { $inc: { 'Counts.LikeCount': (req.body.dislike) ? -1 : 1 } },
        { new: true },
        (err, result) => {
          if (err) {
            debugLog.error('Can\'t insert into database', err);
            res.status(500).send(err);
          }
          else if (result.value != null) {
            debugLog.info('Like count updated');

            logService.addLog('Liked document', 'General User', req.body.id, logger);

            const timec = Date.now();

            const timefeed = {
              Year: nundef.checkReturn(result.value.Year, '0').sanitise().toNum(),
              Branch: nundef.checkReturn(result.value.Branch, 'common').sanitise().stringFix(),
              Subject: nundef.checkReturn(result.value.Subject, 'common').sanitise().stringFix()
            };

            timefeed.Notif = ((result.value.notif) === 'true');

            timestamp.updateOne(timefeed,
              { $set: { updatedOn: timec } },
              { upsert: true }, (timeErr) => {
                if (timeErr) {
                  debugLog.error('Can\'t update timestamp', timeErr);
                  res.status(500).send(timeErr);
                }
                else {
                  debugLog.info('Timestamp updated');
                  res.status(200).send('OK');
                }
              });
          }
          else {
            debugLog.info('Document not found', result);
            res.status(200).send('Document moved...');
          }
        }
      );
    }
  }
  else {
    debugLog.error('Authentication Failure');
    res.status(401).send('Couldn\'t authenticate connection');
  }
});

// Report Document
router.post('/report', (req, res) => {
  if (auth.verifyToken(req.get('Authorization'))) {
    const info = req.app.get('db').collection(infoDB);
    const timestamp = req.app.get('db').collection(timestampDB);
    const logger = req.app.get('db').collection(logDB);

    if (!mongodb.ObjectId.isValid(req.body.id)) {
      debugLog.error('Invalid ObjectId supplied', req.body.id);
      res.status(500).send('Invalid ObjectId');
    }
    else {
      info.findOneAndUpdate(
        { _id: new mongodb.ObjectID(req.body.id) },
        { $set: { isReported: true } },
        (err, result) => {
          if (err) {
            debugLog.error('Couldn\'t report document', err);
            debugLog.info('Manually review the document:', result.value);
            res.status(500).send(err);
          }
          else if (result.value != null) {
            debugLog.info('Reported Document');
            logService.addLog('Reported Document', 'General User', req.body.id, logger);

            const timec = Date.now();

            const timefeed = {
              Year: nundef.checkReturn(result.value.Year, '0').sanitise().toNum(),
              Branch: nundef.checkReturn(result.value.Branch, 'common').sanitise().stringFix(),
              Subject: nundef.checkReturn(result.value.Subject, 'common').sanitise().stringFix()
            };

            timefeed.Notif = ((result.value.notif) === 'true');

            timestamp.updateOne(timefeed,
              { $set: { updatedOn: timec } },
              { upsert: true }, (timeErr) => {
                if (timeErr) {
                  debugLog.error('Can\'t update timestamp', timeErr);
                  res.status(500).send(timeErr);
                }
                else {
                  debugLog.info('Timestamp updated');
                  res.status(200).send('OK');
                }
              });
          }
          else {
            debugLog.info('Document not found', result);
            res.status(200).send('Document moved...');
          }
        }
      );
    }
  }
  else {
    debugLog.error('Authentication Failure');
    res.status(401).send('Couldn\'t authenticate connection');
  }
});

// Download File
router.get('/download', (req, res) => {
  const info = req.app.get('db').collection(infoDB);
  const timestamp = req.app.get('db').collection(timestampDB);
  const logger = req.app.get('db').collection(logDB);

  if (auth.verifyToken(req.get('Authorization'))) {
    const file = Buffer.from(req.query.fURL, 'base64').toString('ascii');

    s3.getObject({
      Bucket: process.env.S3_STORAGE_BUCKET_NAME,
      Key: file.split('/').slice(3).join('/')
    }, (err, data) => {
      if (err) {
        debugLog.error('File couldn\'t be retrieved', err);
        res.status(500).send(err);
      }
      else {
        logService.addLog('Downloaded document', 'General User', auth.resolveToken(req.get('Authorization')), logger);

        info.findAndModify(
          { DownloadURL: file },
          {},
          { $inc: { 'Counts.DownloadCount': 1 } },
          { new: true },
          (downErr, result) => {
            if (downErr) {
              debugLog.error('Query couldn\'t be executed', downErr);
              res.status(500).send(downErr);
            }
            else if (result.value != null) {
              debugLog.info('Download count updated');

              const timec = Date.now();

              const timefeed = {
                Year: nundef.checkReturn(result.value.Year, '0').sanitise().toNum(),
                Branch: nundef.checkReturn(result.value.Branch, 'common').sanitise().stringFix(),
                Subject: nundef.checkReturn(result.value.Subject, 'common').sanitise().stringFix()
              };
              timefeed.Notif = ((result.value.IsNotif) === 'true');

              timestamp.updateOne(timefeed,
                { $set: { Timestamp: timec } },
                { upsert: true }, (timeErr) => {
                  if (timeErr) {
                    debugLog.error('Can\'t update timestamp', timeErr);
                    res.status(500).send(timeErr);
                  }
                  else {
                    debugLog.info('Timestamp updated');
                    res.attachment(metafetch.getFileName(file));
                    res.send(data.Body);
                  }
                });
            }
            else {
              debugLog.info('Document not found', result);
              if (data.Body) {
                res.attachment(metafetch.getFileName(file));
                res.send(data.Body);
              }
              else res.status(200).send('Document moved...');
            }
          }
        );
        debugLog.info('Downloading document');
      }
    });
  }
  else {
    debugLog.error('Authentication Failure');
    res.status(401).send('Couldn\'t authenticate connection');
  }
});

// Last Modified
router.get('/lastModified', (req, res) => {
  const timestamp = req.app.get('db').collection(timestampDB);
  const logger = req.app.get('db').collection(logDB);

  const feed = {};

  if (auth.verifyToken(req.get('Authorization'))) {
    if (req.query.year) {
      feed.Year = req.query.year.sanitise().toNum();
    }
    if (req.query.branch) {
      feed.Branch = req.query.branch.sanitise().stringFix();
    }
    if (req.query.subject) {
      feed.Subject = req.query.subject.sanitise().stringFix();
    }
    if (req.query.notif === 'true') {
      feed.Notif = true;
    }
    else if (req.query.notif === 'false') {
      feed.Notif = false;
    }

    logService.addLog('Last modified timestamp', 'General User', auth.resolveToken(req.get('Authorization')), logger);

    timestamp.find(feed).sort({ Timestamp: -1 }).toArray((err, result) => {
      if (err) {
        debugLog.error('Collection couldn\'t be read', err);
        res.status(500).send(err);
      }
      else if (result && result[0]) {
        debugLog.info('Sent timestamp');
        res.status(200).send(result[0].Timestamp.toString());
      }
      else {
        debugLog.info('Timestamp does not exist');
        res.status(200).send('0');
      }
    });
  }
  else {
    debugLog.error('Authentication Failure');
    res.status(401).send('Couldn\'t authenticate connection');
  }
});


/* Module Exports */
module.exports = router;
