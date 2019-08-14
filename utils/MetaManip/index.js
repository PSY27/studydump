/* Functions */

// Get FileName from Path
const getFileName = filePath => filePath.replace(/.*\//, '').replace(/-(?!.*-).*?(?=\.)/, '');
// [^\/]+(?=\-)|(?=\.).*    to get name without timestamp with extention


/* Module Exports */
module.exports = {
  getFileName
};
