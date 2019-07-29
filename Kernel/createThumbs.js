const GM = require('gm');
const FFMPEG = require('ffmpeg');

const storageURL = `https://${process.env.S3_STORAGE_BUCKET_NAME}.s3.${process.env.S3_STORAGE_BUCKET_REGION}.amazonaws.com/`;
const thumbURL = `${storageURL}thumbs/`;

const assignThumb = (file) => {
  const catagory = file.mimetype.split('/')[0];
  const thumbName = `${file.filename.substring(0, file.filename.indexOf('.'))
  }_thumb.jpg`;
  // append _thumb to filename
  if (catagory === 'image') {
    try {
      GM(`${storageURL}/${file.filename}`)
        .resize('100^', '100^')
        .gravity('Center')
        .crop(100, 100)
        .write(`${thumbURL}/${thumbName}`, (err) => {
          if (err) {
            throw err;
          }
          else {
            console.log('\x1b[32m', 'Success :: Created thumbnail', '\n\r\x1b[0m');
          }
        });
      return (`${thumbURL}/${thumbName}`);
    }
    catch (err) {
      console.log('\x1b[31m', 'Error :: Couldn\'t create thumbnail\n', err, '\n\r\x1b[0m');
      return err;
    }
  }
  else if (catagory === 'video') {
    try {
      new FFMPEG({ source: `${storageURL}/${file.filename}` })
        .on('end', () => {
          console.log('\x1b[32m', 'Success :: Created thumbnail', '\n\r\x1b[0m');
        })
        .on('error', (err) => {
          throw err;
        })
        .takeScreenshots({ count: 1, timemarks: ['5'], filename: '%b_thumb.jpg' }, thumbURL);
    }
    catch (err) {
      console.log('\x1b[31m', 'Error :: Couldn\'t create thumbnail\n', err, '\n\r\x1b[0m');
      return err;
    }
    return (`${thumbURL}/${thumbName}`);
  }
  else if (catagory === 'text') {
    // Get shot
  }
  else if (catagory === 'application') {
    // see individually

  }
  else {
    // chemical,x-conference
    // assign corresponding thumbnail from thumbnailArchive

  }

  return true;
};
