/* Functions */

// Check if feed exists, if not, return specified string
const checkReturn = (feed, alt) => {
  if (feed) return feed;
  return alt;
};


/* Module Exports */
module.exports = {
  checkReturn
};
