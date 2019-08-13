/* Import Declarations */
const express = require('express');

const router = express.Router();
const path = require('path');
const mongodb = require('mongodb');

const jwt = require('jsonwebtoken');
const aws = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const filepreview = require('filepreview-es6');


/* ------ Temporary solution : To be replaced by environment keys (Probably by automation) ------*/
/* ------------------------ Fixed for Release : Added to heroku env keys ------------------------*/

const privateKEY = process.env.PRIVATE_KEY;
const publicKEY = process.env.PUBLIC_KEY;

/* ----------------------------------------------------------------------------------------------*/


/* Custom Variables */
const storageURL = `https://${process.env.S3_STORAGE_BUCKET_NAME}.s3.${process.env.S3_STORAGE_BUCKET_REGION}.amazonaws.com/`;
const uploadURL = 'uploads/';
const thumbURL = `${storageURL}thumbs/`;
const staticThumbURL = `${storageURL}thumbs/static/`;

const infoDB = 'info';
const timestampDB = 'timestamp';
const logDB = 'act_log';

const structURL = require('../custom_imports/structure.json');
const Options = require('../custom_imports/Options');


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
    const UploadPath = uploadURL + FileName;
    cb(null, UploadPath);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1000 }
}).single('uploadFile');

const bulk = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1000 }
}).array('bulkUpload', 50);


/* Functions */
// Resolve JWT Token (remove BEARER if exists)
const resolveToken = (feed) => {
  if (feed.startsWith('Bearer')) {
    return feed.split(' ')[1];
  }
  return feed;
};


// User input integrity check function group
String.prototype.sanitise = function sanitise(rep = '') {
  // Sanitises string (Illegal characters replaced by replacement safe character)
  return this.replace(/[|&;$%@"<*>()+,]/g, rep).toString();
};

String.prototype.toNum = function toNum() {
  // Removes every character that isn't numerical
  return this.replace(/[^0-9]/g, '').toString();
};

String.prototype.stringFix = function stringFix() {
  // Converts input string to lowercase (for consistency)
  return this.toLowerCase().toString();
};

String.prototype.indentFix = function indexFix(rep = '_') {
  // Replaces indent (space, tab, newline) with defined replacement character (for URLs mainly)
  return this.replace(/\s/g, rep).toString();
};


// Check if feed exists, if not, return specified string
const checkReturn = (feed, alt) => {
  if (feed) return feed;
  return alt;
};


// Get FileName from Path (replace timestamp)
const getFileName = filePath => filePath.replace(/.*\//, '').replace(/-(?!.*-).*?(?=\.)/, '');
// [^\/]+(?=\-)|(?=\.).*    to get name without timestamp with extention


// Return High Auth Check
const checkHighAuth = () => true;

// Authenticate JWT
const verifyToken = (feedToken) => {
  try {
    if (!feedToken) throw new Error();
  }
  catch (err) {
    console.log('\x1b[31m', 'Error :: No token provided with call', '\n\r\x1b[0m');
    return false;
  }

  const token = resolveToken(feedToken);

  try {
    jwt.verify(token, publicKEY, Options.signOptions, (err, decoded) => {
      if (decoded) {
        console.log('\x1b[32m', 'Success :: Token authorized', '\n\r\x1b[0m');
      }
      else {
        throw err;
      }
    });
    return true;
  }
  catch (err) {
    console.log('\x1b[31m', 'Error :: Couldn\'t authenticate token', '\n\r\x1b[0m');
    return false;
  }
};


// Activity Logging
const addLog = (action, desc, db) => {
  const feed = { Action: action, Description: desc, Timestamp: Date.now() };

  db.insert(feed, (err) => {
    if (err) {
      console.log('\x1b[31m', 'Error :: Can\'t insert into database\n', err, '\n\r\x1b[0m');
    }
    else {
      console.log('\x1b[32m', 'Success :: Inserted into database', '\n\r\x1b[0m');
    }
  });
};


// Creating thumbnails
const assignThumb = (file) => {
  const inFile = file.key.indentFix();
  const thumbName = file.key.split('/').slice(-1)[0].indentFix().substring(0, file.key.lastIndexOf('.'));
  const thumbLoc = `${thumbURL + thumbName.replace('.', '_')}_thumb.jpg`;

  return new Promise((resolve, reject) => {
    s3.getObject({ Bucket: process.env.S3_STORAGE_BUCKET_NAME, Key: inFile }, (err, data) => {
      if (err) {
        console.log('\x1b[31m', 'Error :: Error occured in getting s3 object stream\n', err, '\n\r\x1b[0m');
        return reject(err);
      }
      return filepreview.generateAsync(data.Body.toString(), thumbLoc, Options.thumbOptions)
        .then((response) => {
          console.log('\x1b[36m', 'Info :: Response recieved\n', response, '\n\r\x1b[0m');
          if (response.thumbnail === undefined) {
            console.log('\x1b[36m', 'Info :: Assigning respective pseudo thumbnail', '\n\r\x1b[0m');
            const statThumb = `${path.extname(inFile).toLowerCase().replace('.', '')}.png`;
            try {
              if (Options.supportedThumbs.indexOf(statThumb.split('.')[0]) !== -1) {
                return resolve({ thumbnail: staticThumbURL + statThumb });
              }
              console.log('\x1b[36m', 'Info :: Couldn\'t find suitable icon. Dropping to default icon', '\n\r\x1b[0m');
              return resolve({ thumbnail: `${staticThumbURL}common.png` });
            }
            catch (thumbErr) {
              console.error(thumbErr);
              return reject(thumbErr);
            }
          }
          else {
            return resolve(response);
          }
        })
        .catch((error) => {
          console.log('\x1b[31m', 'Error :: Caught an error while creating thumbnails\n', error, '\n\r\x1b[0m');
          console.log('\x1b[36m', 'Info :: Assigning respective pseudo thumbnail', '\n\r\x1b[0m');
          const statThumb = `${path.extname(inFile).toLowerCase().replace('.', '')}.png`;
          try {
            if (Options.supportedThumbs.indexOf(statThumb.split('.')[0]) !== -1) {
              return resolve({ thumbnail: staticThumbURL + statThumb });
            }

            console.log('\x1b[36m', 'Info :: Couldn\'t find suitable icon. Dropping to default icon', '\n\r\x1b[0m');
            return resolve({ thumbnail: `${staticThumbURL}common.png` });
          }
          catch (thumbErr) {
            console.log('\x1b[31m', 'Error :: Caught an error while creating thumbnails\n', thumbErr, '\n\r\x1b[0m');
            return reject(thumbErr);
          }
        });
    });
  });
};


/* Generate JWT */
router.post('/getToken', (req, res) => {
  const logger = req.app.get('db').collection(logDB);

  if (checkHighAuth()) {
    const payload = {
      name: req.body.name.sanitise(),
      email: req.body.email.sanitise()
    };

    const token = jwt.sign(payload, privateKEY, Options.signOptions);
    console.log('Token: ', token);
    res.status(200).send(token);
    addLog('Token generated', token, logger);
  }
  else {
    console.log('\x1b[31m', 'Error :: Authentication Failure', '\n\r\x1b[0m');
    res.status(401).send('Couldn\'t authenticate connection');
  }
});


/* Structure JSON Return Route */
router.get('/getStructure', (req, res) => {
  const logger = req.app.get('db').collection(logDB);

  if (verifyToken(req.get('Authorization'))) {
    console.log('\x1b[36m', 'Info :: Sending structure', '\n\r\x1b[0m');
    res.status(200).json(structURL);
    addLog('Structure called', resolveToken(req.get('Authorization')), logger);
  }
  else {
    console.log('\x1b[31m', 'Error :: Authentication Failure', '\n\r\x1b[0m');
    res.status(401).send('Couldn\'t authenticate connection');
  }
});


/* Search Document Route */
router.get('/search', (req, res) => {
  const info = req.app.get('db').collection(infoDB);

  const queryArray = req.query.s.split(',');

  const sanitisedArray = queryArray.map(e => e.sanitise());

  const regex = sanitisedArray.map(e => new RegExp(`.*${e}.*`, 'i'));

  if (verifyToken(req.get('Authorization'))) {
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

    info.find(
      {
        $and: [
          feed,
          {
            $or: [
              { FileName: { $in: regex } },
              { FileType: { $in: regex } }
            ]
          }
        ]
      }
    ).toArray((err, result) => {
      // duplicate check
      if (err) {
        console.log('\x1b[31m', 'Error :: Collection couldn\'t be read\n', err, '\n\r\x1b[0m');
        res.status(500).send(err);
      }
      else if (result.length) {
        console.log('\x1b[36m', 'Info :: Found search result', '\n\r\x1b[0m');
        res.status(200).send(result);
      }
      else {
        console.log('\x1b[36m', 'Info :: No results found', '\n\r\x1b[0m');
        res.status(200).send('No upload found');
      }
    });
  }
  else {
    console.log('\x1b[31m', 'Error :: Authentication Failure', '\n\r\x1b[0m');
    res.status(401).send('Couldn\'t authenticate connection');
  }
});


/* Upload File Route */
router.post('/uploadFile', (req, res) => {
  const info = req.app.get('db').collection(infoDB);
  const timestamp = req.app.get('db').collection(timestampDB);
  const logger = req.app.get('db').collection(logDB);

  if (verifyToken(req.get('Authorization'))) {
    upload(req, res, (err) => {
      if (err) {
        console.log('\x1b[31m', 'Error :: File couldn\'t be uploaded\n', err, '\n\r\x1b[0m');
        res.status(500).send(err);
      }
      else if (!req.file) {
        console.log('\x1b[31m', 'Error :: No file provided', '\n\r\x1b[0m');
        res.status(500).send('No file was sent');
      }
      else {
        return info.find({
          FileName: req.file.originalname,
          FileType: req.file.mimetype,
          Size: req.file.size,
          Filters: {
            Year: checkReturn(req.body.year, '0').sanitise().toNum(),
            Branch: checkReturn(req.body.branch, 'common').sanitise().stringFix(),
            Subject: checkReturn(req.body.subject, 'common').sanitise().stringFix()
          },
          IsNotif: checkReturn(req.body.notif, 'false')
        }).toArray((findErr, result) => {
          // duplicate check
          if (findErr) {
            console.log('\x1b[31m', 'Error :: Collection couldn\'t be read\n', findErr, '\n\r\x1b[0m');
            res.status(500).send('Database is currently down!');
          }
          else if (result.length) {
            console.log('\x1b[33m', 'Warning :: Duplicate document found', '\n\r\x1b[0m');
            res.status(500).send('Duplicate found!');
          }
          else {
            console.log('\x1b[36m', 'Info :: File uploaded successfully', '\n\r\x1b[0m');

            assignThumb(req.file).then((thumbObj) => {
              console.log('\x1b[36m', 'Info :: Thumbnail generated at\n', thumbObj.thumbnail, '\n\r\x1b[0m');

              const feed = {
                FileName: req.file.originalname,
                FileType: req.file.mimetype,
                Size: req.file.size,
                Filters: {
                  Year: checkReturn(req.body.year, '0').sanitise().toNum(),
                  Branch: checkReturn(req.body.branch, 'common').sanitise().stringFix(),
                  Subject: checkReturn(req.body.subject, 'common').sanitise().stringFix()
                },
                IsNotif: checkReturn(req.body.notif, 'false').sanitise().stringFix(),
                DownloadURL: req.file.location,
                ThumbnailURL: thumbObj.thumbnail,
                Counts: {
                  DownloadCount: 0,
                  CallCount: 0,
                  LikeCount: 0
                },
                isAvailable: true,
                uploadTime: Date.now()
              };

              info.insertOne(feed, (insertErr, insertResult) => {
                if (insertErr) {
                  console.log('\x1b[31m', 'Error :: Can\'t insert into database\n', insertErr, '\n\r\x1b[0m');
                  res.status(500).send(insertErr);
                }
                else {
                  console.log('\x1b[32m', 'Success :: Inserted into database', '\n\r\x1b[0m');
                  addLog('File uploaded', insertResult.ops[0]._id.toString(), logger);

                  const timec = Date.now();

                  const timefeed = {
                    Year: checkReturn(req.body.year, '0').sanitise().toNum(),
                    Branch: checkReturn(req.body.branch, 'common').sanitise().stringFix(),
                    Subject: checkReturn(req.body.subject, 'common').sanitise().stringFix()
                  };
                  timefeed.Notif = ((req.body.notif) === 'true');

                  timestamp.update(timefeed,
                    { $set: { Timestamp: timec } },
                    { upsert: true }, (errTime) => {
                      if (err) {
                        console.log('\x1b[31m', 'Error :: Can\'t update timestamp\n', errTime, '\n\r\x1b[0m');
                        res.status(500).send(errTime);
                      }
                      else {
                        console.log('\x1b[36m', 'Info :: Timestamp updated', '\n\r\x1b[0m');
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
    console.log('\x1b[31m', 'Error :: Authentication Failure', '\n\r\x1b[0m');
    res.status(401).send('Couldn\'t authenticate connection');
  }
});


/* Bulk Upload Route */
router.post('/bulkUpload', (req, res) => {
  const info = req.app.get('db').collection(infoDB);
  const timestamp = req.app.get('db').collection(timestampDB);
  const logger = req.app.get('db').collection(logDB);

  if (verifyToken(req.get('Authorization'))) {
    bulk(req, res, (err) => {
      if (err) {
        console.log('\x1b[31m', 'Error :: File couldn\'t be uploaded\n', err, '\n\r\x1b[0m');
        res.status(500).send(err);
      }
      else if (!req.files) {
        console.log('\x1b[31m', 'Error :: No file provided', '\n\r\x1b[0m');
        res.status(500).send('No file was sent');
      }
      else {
        return req.files.forEach((doc) => {
          info.find({
            FileName: doc.originalname,
            FileType: doc.mimetype,
            Size: doc.size,
            Filters: {
              Year: checkReturn(req.body.year, '0').sanitise().toNum(),
              Branch: checkReturn(req.body.branch, 'common').sanitise().stringFix(),
              Subject: checkReturn(req.body.subject, 'common').sanitise().stringFix()
            },
            IsNotif: checkReturn(req.body.notif, 'false')
          }).toArray((findErr, result) => {
          // duplicate check
            if (findErr) {
              console.log('\x1b[31m', 'Error :: Collection couldn\'t be read\n', findErr, '\n\r\x1b[0m');
              res.status(500).send('Database is currently down!');
            }
            else if (result.length) {
              console.log('\x1b[33m', 'Warning :: Duplicate document found', '\n\r\x1b[0m');
              res.status(500).send('Duplicate found!');
            }
            else {
              console.log('\x1b[36m', 'Info :: File uploaded successfully', '\n\r\x1b[0m');

              assignThumb(req.file).then((thumbObj) => {
                console.log('\x1b[36m', 'Info :: Thumbnail generated at\n', thumbObj.thumbnail, '\n\r\x1b[0m');

                const feed = {
                  FileName: doc.originalname,
                  FileType: doc.mimetype,
                  Size: doc.size,
                  Filters: {
                    Year: checkReturn(req.body.year, '0').sanitise().toNum(),
                    Branch: checkReturn(req.body.branch, 'common').sanitise().stringFix(),
                    Subject: checkReturn(req.body.subject, 'common').sanitise().stringFix()
                  },
                  IsNotif: checkReturn(req.body.notif, 'false').sanitise().stringFix(),
                  DownloadURL: doc.location,
                  ThumbnailURL: thumbObj.thumbnail,
                  Counts: {
                    DownloadCount: 0,
                    CallCount: 0,
                    LikeCount: 0
                  },
                  isAvailable: true,
                  uploadTime: Date.now()
                };

                info.insertOne(feed, (insertErr, insertResult) => {
                  if (insertErr) {
                    console.log('\x1b[31m', 'Error :: Can\'t insert into database\n', insertErr, '\n\r\x1b[0m');
                    res.status(500).send(insertErr);
                  }
                  else {
                    console.log('\x1b[32m', 'Success :: Inserted into database', '\n\r\x1b[0m');
                    addLog('File uploaded', insertResult.ops[0]._id.toString(), logger);

                    const timec = Date.now();

                    const timefeed = {
                      Year: checkReturn(req.body.year, '0').sanitise().toNum(),
                      Branch: checkReturn(req.body.branch, 'common').sanitise().stringFix(),
                      Subject: checkReturn(req.body.subject, 'common').sanitise().stringFix()
                    };
                    timefeed.Notif = ((req.body.notif) === 'true');

                    timestamp.update(timefeed,
                      { $set: { Timestamp: timec } },
                      { upsert: true }, (errTime) => {
                        if (err) {
                          console.log('\x1b[31m', 'Error :: Can\'t update timestamp\n', errTime, '\n\r\x1b[0m');
                          res.status(500).send(errTime);
                        }
                        else {
                          console.log('\x1b[36m', 'Info :: Timestamp updated', '\n\r\x1b[0m');
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
    console.log('\x1b[31m', 'Error :: Authentication Failure', '\n\r\x1b[0m');
    res.status(401).send('Couldn\'t authenticate connection');
  }
});


/* List Upload Route */
router.get('/listUploads', (req, res) => {
  const info = req.app.get('db').collection(infoDB);
  const logger = req.app.get('db').collection(logDB);

  if (verifyToken(req.get('Authorization'))) {
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
      console.log(feed.IsNotif);
    }
    if (!req.query.available) {
      feed.isAvailable = true;
    }

    addLog('Uploads list sent', resolveToken(req.get('Authorization')), logger);

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
        console.log('\x1b[31m', 'Error :: Collection couldn\'t be read\n', errSet, '\n\r\x1b[0m');
        res.status(500).send(errSet);
      }
      else if (resultSet.length) {
        res.status(200).send(resultSet);
        resultSet.forEach((doc, key, result) => {
          info.update({ _id: doc._id }, { $inc: { 'Counts.CallCount': 1 } }, (err) => {
            if (err) {
              console.log('\x1b[31m', 'Error :: Query couldn\'t be executed\n', err, '\n\r\x1b[0m');
            }
            else {
              console.log('\x1b[36m', 'Info :: Call count updated', '\n\r\x1b[0m');
              console.log('\x1b[36m', 'Info :: Sending documents', '\n\r\x1b[0m');
            }
            if (Object.is(result.length, key)) {
              console.log('\x1b[36m', 'Info :: I was called now', '\n\r\x1b[0m');
            }
          });
        });
      }
      else {
        console.log('\x1b[36m', 'Info :: No documents found', '\n\r\x1b[0m');
        res.status(200).send('No documents found');
      }
    });
  }
  else {
    console.log('\x1b[31m', 'Error :: Authentication Failure', '\n\r\x1b[0m');
    res.status(401).send('Couldn\'t authenticate connection');
  }
});

/* Update Like Count */
router.post('/updateLike', (req, res) => {
  if (verifyToken(req.get('Authorization'))) {
    const info = req.app.get('db').collection(infoDB);
    const timestamp = req.app.get('db').collection(timestampDB);
    const logger = req.app.get('db').collection(logDB);

    if (!mongodb.ObjectId.isValid(req.body.id)) {
      console.log('\x1b[31m', 'Error :: Invalid ObjectId supplied', '\n\r\x1b[0m');
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
            console.log('\x1b[31m', 'Error :: Can\'t insert into database\n', err, '\n\r\x1b[0m');
            res.status(500).send(err);
          }
          else if (result.value != null) {
            console.log('\x1b[36m', 'Info :: Like count updated', '\n\r\x1b[0m');

            addLog('Liked document', req.body.id, logger);

            const timec = Date.now();

            const timefeed = {
              Year: checkReturn(result.value.Year, '0').sanitise().toNum(),
              Branch: checkReturn(result.value.Branch, 'common').sanitise().stringFix(),
              Subject: checkReturn(result.value.Subject, 'common').sanitise().stringFix()
            };

            timefeed.Notif = ((result.value.notif) === 'true');

            timestamp.update(timefeed,
              { $set: { updatedOn: timec } },
              { upsert: true }, (timeErr) => {
                if (timeErr) {
                  console.log('\x1b[31m', 'Error :: Can\'t update timestamp\n', timeErr, '\n\r\x1b[0m');
                  res.status(500).send(timeErr);
                }
                else {
                  console.log('\x1b[36m', 'Info :: Timestamp updated', '\n\r\x1b[0m');
                  res.status(200).send('OK');
                }
              });
          }
          else {
            console.log('\x1b[36m', 'Info :: Document not found', result, '\n\r\x1b[0m');
            res.status(200).send('Document moved...');
          }
        }
      );
    }
  }
  else {
    console.log('\x1b[31m', 'Error :: Authentication Failure', '\n\r\x1b[0m');
    res.status(401).send('Couldn\'t authenticate connection');
  }
});


/* Download File Route */
router.get('/download', (req, res) => {
  const info = req.app.get('db').collection(infoDB);
  const timestamp = req.app.get('db').collection(timestampDB);
  const logger = req.app.get('db').collection(logDB);

  if (verifyToken(req.get('Authorization'))) {
    const file = Buffer.from(req.query.fURL, 'base64').toString('ascii');

    s3.getObject({
      Bucket: process.env.S3_STORAGE_BUCKET_NAME,
      Key: file.split('/').slice(3).join('/')
    }, (err, data) => {
      if (err) {
        console.log('\x1b[31m', 'Error :: File couldn\'t be retrieved\n', err, '\n\r\x1b[0m');
        res.status(500).send(err);
      }
      else {
        addLog('Downloaded document', resolveToken(req.get('Authorization')), logger);

        info.findAndModify(
          { DownloadURL: file },
          {},
          { $inc: { 'Counts.DownloadCount': 1 } },
          { new: true },
          (downErr, result) => {
            if (downErr) {
              console.log('\x1b[31m', 'Error :: Query couldn\'t be executed\n', downErr, '\n\r\x1b[0m');
              res.status(500).send(downErr);
            }
            else if (result.value != null) {
              console.log('\x1b[36m', 'Info :: Download count updated', '\n\r\x1b[0m');

              const timec = Date.now();

              const timefeed = {
                Year: checkReturn(result.value.Year, '0').sanitise().toNum(),
                Branch: checkReturn(result.value.Branch, 'common').sanitise().stringFix(),
                Subject: checkReturn(result.value.Subject, 'common').sanitise().stringFix()
              };
              timefeed.Notif = ((result.value.IsNotif) === 'true');

              timestamp.update(timefeed,
                { $set: { Timestamp: timec } },
                { upsert: true }, (timeErr) => {
                  if (timeErr) {
                    console.log('\x1b[31m', 'Error :: Can\'t update timestamp\n', timeErr, '\n\r\x1b[0m');
                    res.status(500).send(timeErr);
                  }
                  else {
                    console.log('\x1b[36m', 'Info :: Timestamp updated', '\n\r\x1b[0m');
                    res.attachment(getFileName(file));
                    res.send(data.Body);
                  }
                });
            }
            else {
              console.log('\x1b[36m', 'Info :: Document not found', result, '\n\r\x1b[0m');
              if (data.Body) {
                res.attachment(getFileName(file));
                res.send(data.Body);
              }
              else res.status(200).send('Document moved...');
            }
          }
        );
        console.log('\x1b[36m', 'Info :: Downloading document', '\n\r\x1b[0m');
      }
    });
  }
  else {
    console.log('\x1b[31m', 'Error :: Authentication Failure', '\n\r\x1b[0m');
    res.status(401).send('Couldn\'t authenticate connection');
  }
});


/* Last Modified Route */
router.get('/lastModified', (req, res) => {
  const timestamp = req.app.get('db').collection(timestampDB);
  const logger = req.app.get('db').collection(logDB);

  const feed = {};

  if (verifyToken(req.get('Authorization'))) {
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

    addLog('Last modified timestamp', resolveToken(req.get('Authorization')), logger);

    timestamp.find(feed).sort({ Timestamp: -1 }).toArray((err, result) => {
      if (err) {
        console.log('\x1b[31m', 'Error :: Collection couldn\'t be read\n', err, '\n\r\x1b[0m');
        res.status(500).send(err);
      }
      else if (result && result[0]) {
        console.log('\x1b[36m', 'Info :: Sent timestamp', '\n\r\x1b[0m');
        res.status(200).send(result[0].Timestamp.toString());
      }
      else {
        console.log('\x1b[36m', 'Info :: Timestamp does not exist', '\n\r\x1b[0m');
        res.status(400).send('0');
      }
    });
  }
  else {
    console.log('\x1b[31m', 'Error :: Authentication Failure', '\n\r\x1b[0m');
    res.status(401).send('Couldn\'t authenticate connection');
  }
});


module.exports = router;
