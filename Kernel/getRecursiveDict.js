// Recursive Dictionary Key Call
const getKey = (currkey) => {
  if (typeof currkey === 'object') {
    for (const i in currkey) {
      return getKey(currkey[i]);
    }
  }
  else {
    return currkey;
  }
  return true;
};
