/* Import Declarations */
const express = require('express');

const router = express.Router();
const fs = require('fs');
const jwt = require('jsonwebtoken');
const mongodb = require('mongodb');


/* Custom Variables */
const infoDB = 'info';
const Options = require('../custom_imports/Options');

const privateKEY = process.env.PRIVATE_KEY;
const publicKEY = process.env.PUBLIC_KEY;


/* Index Route */
router.get('/', (req, res) => {
  res.render('index', { title: 'Admin Panel' });
});


/* Token Creation */
router.post('/getToken', (req, res) => {
  const payload = {
    name: req.body.name,
    userid: req.body.userid
  };

  const token = jwt.sign(payload, privateKEY, Options.signOptions);
  console.log('Token: ', token);
  res.send(token);
});


/* Admin Token Creation */
router.post('/getToken', (req, res) => {
  const payload = {
    name: req.body.name,
    userid: req.body.userid
  };

  const token = jwt.sign(payload, privateKEY, Options.signOptions);
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
    const info = req.app.get('db').collection(infoDB);

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
    });
  }
  else {
    console.log('\x1b[31m', 'Error :: Authentication Failure', '\x1b[0m');
    res.status(401).send('Couldn\'t authenticate connection');
  }
});


/* Delete Documents Route */
router.post('/delete/:id', (req, res) => {
  if (true) {
    // HIGH AUTH REQUIRED

    const info = req.app.get('db').collection(infoDB);

    info.deleteOne({ _id: new mongodb.ObjectId(req.params.id) }, (err, result) => {
      if (err) {
        console.log('\x1b[31m', 'Error :: Can\'t run query\n\r', err, '\x1b[0m');
        res.status(500).send(err);
      }
      else {
        console.log('\x1b[36m', 'Info :: Removed document from database\n\r', '\x1b[0m');
        fs.access(req.body.url, (fsErr, fsRes) => {
          if (fsErr) {
            console.log('\x1b[31m', 'Error :: No url supplied\n\r', fsErr, '\x1b[0m');
          }
          else {
            fs.unlink(req.body.url, (unFsErr) => {
              if (unFsErr) {
                console.log('\x1b[36m', 'Error :: Couldn\'t delete the file\n\r', unFsErr, '\x1b[0m');
              }
              else {
                console.log('\x1b[36m', 'Info :: Deleted file from server\n\r', '\x1b[0m');
              }
            });
          }
        });
        res.redirect('../view');
      }
    });
  }
  else {
    console.log('\x1b[31m', 'Error :: Authentication Failure', '\x1b[0m');
    res.status(401).send('Couldn\'t authenticate connection');
  }
});

module.exports = router;
