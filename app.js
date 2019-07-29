/* Import Requires */
const createError = require('http-errors');
const express = require('express');
const cors = require('cors');
const path = require('path');
const favicon = require('serve-favicon');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const mongo = require('mongodb');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

const { MongoClient } = mongo;

/* Setting up environment */
dotenv.config();

/* Server Variables */
const MongoURL = process.env.MONGO_URL;


/* Routes */
const indexRouter = require('./routes/index');
const debugRouter = require('./routes/debug');
const usersRouter = require('./routes/users');


/* Initializing App */
const app = express();


/* CORS - Must change to custom on deploy */
app.use(cors());


/* View Engine Setup */
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(favicon(path.join(__dirname, 'public', 'images', 'icons', 'favicon.ico')));
app.use(express.static(path.join(__dirname, 'public')));


/* App Debug Routing */
app.use('/', (process.env.NODE_ENV) === 'development' ? debugRouter : indexRouter);
app.use('/users', usersRouter);


/* MongoClient Init */
MongoClient.connect(MongoURL, { useNewUrlParser: true }, (err, client) => {
  if (err) {
    console.log(`Failed to connect to the database. ${err.stack}`);
  }
  const db = client.db('study_dump');
  app.set('db', db);
  console.log('Node.js app is listening to MongoServer');
});


/* catch 404 and forward to error handler */
app.use((req, res, next) => {
  next(createError(404));
});


/* error handler */
app.use((err, req, res) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


module.exports = app;
