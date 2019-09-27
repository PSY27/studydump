/* Functions */

// Get FileName from Path
const getFileName = (filePath) => {
  if (typeof (filePath) === 'string') return filePath.replace(/.*\//, '').replace(/-(?!.*-).*?(?=\.)/, '');
  return undefined;
};
// [^\/]+(?=\-)|(?=\.).*    to get name without timestamp with extention


/* Module Exports */
module.exports = {
  getFileName
};
