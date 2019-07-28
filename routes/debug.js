/* Import Declarations */
var express = require('express');

var router = express.Router();
var fs = require('fs');
var jwt = require('jsonwebtoken');
var mongodb = require('mongodb');

var { MongoClient } = mongodb;


/* Custom Variables */
var infoDB = 'info';
var Options = require(path.resolve('custom_imports/Options'));
var privateKEY = process.env.PRIVATE_KEY;
var publicKEY = process.env.PUBLIC_KEY;


/* Index Route */
router.get('/', (req, res) => {
  res.render('index', { title: 'Testing' });
});


/* Token Creation */
router.post('/getToken', (req, res) => {
  var payload = {
    name: req.body.name,
    userid: req.body.userid
  };

  var token = jwt.sign(payload, privateKEY, Options.signOptions);
  console.log('Token: ', token);
  res.send(token);
});


/* Admin Token Creation */
router.post('/getToken', (req, res) => {
  var payload = {
    name: req.body.name,
    userid: req.body.userid
  };

  var token = jwt.sign(payload, privateKEY, Options.signOptions);
  res.send(token);
});


/* Verifying Token */
router.get('/verifyToken', (req, res) => {
  jwt.verify(req.get('Authorization').split(' ')[1], publicKEY, Options.signOptions, (err) => {
    if (err) {
      console.log('\nJWT verification result: ');
      res.send('NAH');
    }
    else {
      console.log('\nJWT verification result: ');
      res.send('OK');
    }
  });
});


/* View Documents Route */
router.get('/view', (req, res) => {
  if (true) {
    // authentication for usage only by apk or website
    MongoClient.connect(MongoURL, (err, db) => {
      if (err) {
        console.log('\x1b[31m', 'Error :: Can\'t connect to database\n\r', err, '\x1b[0m');
        res.status(500).send(err);
      }
      else {
        console.log('\x1b[32m', 'Success :: Connection established to', MongoURL, '\x1b[0m');

        var info = db.collection(infoDB);

        info.find({}).sort({ 'Counts.DownloadCount': -1, 'Counts.CallCount': -1, _id: 1 }).toArray((err, result) => {
          if (err) {
            console.log('\x1b[31m', 'Error :: Can\'t run query\n\r', err, '\x1b[0m');
            res.status(500).send(err);
          }
          else if (result.length) {
            res.render('display', {
              display: result
            });
          }
          else {
            console.log('\x1b[36m', 'Info :: No documents found\n\r', '\x1b[0m');
            res.status(200).send('No documents found');
          }
          db.close();
        });
      }
    });
  }
  else {
    console.log('\x1b[31m', 'Error :: Authentication Failure', '\x1b[0m');
    res.status(401).send('Couldn\'t authenticate connection');
  }
});


/* Delete Documents Route */
router.post('/delete/:id', (req, res) => {
  if (true) {																														// HIGH AUTH REQUIRED
    MongoClient.connect(MongoURL, (err, db) => {
      if (err) {
        console.log('\x1b[31m', 'Error :: Can\'t connect to database\n\r', err, '\x1b[0m');
        res.status(500).send(err);
      }
      else {
        console.log('\x1b[32m', 'Success :: Connection established to', MongoURL, '\x1b[0m');

        var info = db.collection(infoDB);

        info.deleteOne({ _id: new mongodb.ObjectId(req.params.id) }, (err, result) => {
          if (err) {
            console.log('\x1b[31m', 'Error :: Can\'t run query\n\r', err, '\x1b[0m');
            res.status(500).send(err);
          }
          else {
            console.log('\x1b[36m', 'Info :: Removed document from database\n\r', '\x1b[0m');
            fs.access(req.body.url, (err, res) => {
              if (err) {
                console.log('\x1b[31m', 'Error :: No url supplied\n\r', err, '\x1b[0m');
              }
              else {
                fs.unlink(req.body.url, (err) => {
                  if (err) {
                    console.log('\x1b[36m', 'Error :: Couldn\'t delete the file\n\r', err, '\x1b[0m');
                  }
                  else {
                    console.log('\x1b[36m', 'Info :: Deleted file from server\n\r', '\x1b[0m');
                  }
                });
              }
            });
            res.redirect('/view');
          }
          db.close();
        });
      }
    });
  }
  else {
    console.log('\x1b[31m', 'Error :: Authentication Failure', '\x1b[0m');
    res.status(401).send('Couldn\'t authenticate connection');
  }
});

module.exports = router;
