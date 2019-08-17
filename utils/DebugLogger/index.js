/* eslint no-console: ["error", { allow: ["log"] }] */

/* Functions */

// Show Error
const error = (tip, msg) => {
  if (process.env.NODE_ENV !== 'production') console.log('\x1b[31m', 'Error :: ', tip, '\n', msg || '', '\n\r\x1b[0m');
};

// Show Success
const success = (tip, msg) => {
  if (process.env.NODE_ENV !== 'production') console.log('\x1b[32m', 'Success :: ', tip, '\n', msg || '', '\n\r\x1b[0m');
};

// Show Warning
const warn = (tip, msg) => {
  if (process.env.NODE_ENV !== 'production') console.log('\x1b[33m', 'Warning :: ', tip, '\n', msg || '', '\n\r\x1b[0m');
};

const debug = (tip, msg) => {
  if (process.env.NODE_ENV !== 'production') console.log('\x1b[34m', 'Debug :: ', tip, '\n', msg || '', '\n\r\x1b[0m');
};

// Show Info Tip
const info = (tip, msg) => {
  if (process.env.NODE_ENV !== 'production') console.log('\x1b[36m', 'Info :: ', tip, '\n', msg || '', '\n\r\x1b[0m');
};

// Show Waypoint Method
const waypoint = (tip, methodArr) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('\x1b[34m', 'WayPoint :: ', tip, '\n\r\x1b[0m');
    methodArr.map((method) => {
      console.log('\x1b[35m', '==>', method, '\n\r\x1b[0m');
      return true;
    });
    console.log('End of method exec');
  }
};


/* Module Exports */
module.exports = {
  error,
  success,
  warn,
  debug,
  info,
  waypoint
};
