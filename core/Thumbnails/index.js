/* Legacy Modules */
const filepreview = require('filepreview-es6');
const aws = require('aws-sdk');
const path = require('path');


/* Import Utils */
const debugLog = require('utils/DebugLogger');

/* Custom Options */
const Options = require('models/Options');


/* Custom Variables */
const { thumbURL, staticThumbURL } = require('models/CustomVariables');


/* Module Pre-Init */
const s3 = new aws.S3();


/* Methods */

// Creating thumbnails
const assignThumb = (file) => {
  const inFile = file.key.indentFix();
  const thumbName = file.key.split('/').slice(-1)[0].indentFix().substring(0, file.key.lastIndexOf('.'));
  const thumbLoc = `${thumbURL + thumbName.replace('.', '_')}_thumb.jpg`;

  return new Promise((resolve, reject) => {
    s3.getObject({ Bucket: process.env.S3_STORAGE_BUCKET_NAME, Key: inFile }, (err, data) => {
      if (err) {
        debugLog.error('Error occured in getting s3 object stream', err);
        return reject(err);
      }
      return filepreview.generateAsync(data.Body.toString(), thumbLoc, Options.thumbOptions)
        .then((response) => {
          debugLog.info('Response recieved', response);
          if (response.thumbnail === undefined) {
            throw new Error('Can\'t generate thumbnails');
          }
          else {
            return resolve(response);
          }
        })
        .catch((error) => {
          debugLog.error(error);
          debugLog.info('Assigning respective pseudo thumbnail');
          const statThumb = `${path.extname(inFile).toLowerCase().replace('.', '')}.png`;
          try {
            if (Options.supportedThumbs.indexOf(statThumb.split('.')[0]) !== -1) {
              return resolve({ thumbnail: staticThumbURL + statThumb });
            }

            debugLog.info('Couldn\'t find suitable icon. Dropping to default icon');
            return resolve({ thumbnail: `${staticThumbURL}common.png` });
          }
          catch (thumbErr) {
            debugLog.error('Caught an error while creating thumbnails', thumbErr);
            return reject(thumbErr);
          }
        });
    });
  });
};


/* Module Exports */
module.exports = {
  assignThumb
};
