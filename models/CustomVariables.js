/* S3 Constants */
const uploadSuffix = 'uploads/';


/* Thumbnail Constants */
const storageURL = `https://${process.env.S3_STORAGE_BUCKET_NAME}.s3.${process.env.S3_STORAGE_BUCKET_REGION}.amazonaws.com/`;
const thumbURL = `${storageURL}thumbs/`;
const staticThumbURL = `${storageURL}thumbs/static/`;


/* Database Constants */
const infoDB = process.env.INFO_DB;
const timestampDB = process.env.TIMESTAMP_DB;
const logDB = process.env.LOG_DB;


/* Frontend Version */
const appVersion = process.env.FRONTEND_VERSION;


/* Module Exports */
module.exports = {
  uploadSuffix,
  thumbURL,
  staticThumbURL,
  infoDB,
  timestampDB,
  logDB,
  appVersion
};
