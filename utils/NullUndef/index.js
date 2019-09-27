/* Functions */

// Check if feed exists, if not, return specified string
const checkReturn = (feed, alt) => {
  if (feed !== undefined) return feed;
  if (alt !== undefined) return alt;
  return null;
};


/* Module Exports */
module.exports = {
  checkReturn
};
