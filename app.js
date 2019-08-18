/* Legacy Modules */
const createError = require('http-errors');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const favicon = require('serve-favicon');
const cookieParser = require('cookie-parser');
require('module-alias/register');


/* Module Pre-Init */

// Initializing App
const app = express();

// Setup dotenv
// eslint-disable-next-line no-unused-expressions
(!process.env.NODE_ENV || process.env.NODE_ENV !== 'production') ? require('dotenv').config() : '';


/* Import Services */
const mongoService = require('@services/MongoService');


/* Import Utils */
const debugLog = require('@utils/DebugLogger');


/* Import Routes */
const indexRouter = require('@routes/index');
const adminRouter = require('@routes/admin');
const usersRouter = require('@routes/users');


/* Mongo Setup */
const MongoURL = process.env.MONGO_URL;


/* CORS Setup */
const whitelist = JSON.parse(process.env.CORS_WHITELIST);
const corsOptions = {
  origin(origin, callback) {
    if (!origin || whitelist.indexOf(origin) !== -1) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'), false);
  }
};

app.use(cors(process.env.NODE_ENV === 'development' ? '' : corsOptions));


/* App Setup */

// View Engine Setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Use legacy middlewares
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(favicon(path.join(__dirname, 'public', 'images', 'icons', 'favicon.ico')));
app.use(express.static(path.join(__dirname, 'public')));

// CORS Pre-flight setup for all routes
app.options('*', cors());

// App Routing
app.use('/', indexRouter);
app.use('/admin', adminRouter);
app.use('/users', usersRouter);

// Mongo Initialization
mongoService.init(MongoURL)
  .then((db) => {
    app.set('db', db);
  })
  .catch((err) => {
    debugLog.error('Fatal : Mongo unaccessible', err);
  });


/* 404 Handler */
app.use((req, res, next) => {
  next(createError(404));
});


/* Error Handler */
app.use((err, req, res) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


/* Module Exports */
module.exports = app;
