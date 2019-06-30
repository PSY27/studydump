/* Import Requires */
	const createError = require('http-errors');
	const express = require('express');
	const cors = require('cors');
	const aws = require('aws-sdk');
	const path = require('path');
	const favicon = require('serve-favicon');
	const cookieParser = require('cookie-parser');
	const logger = require('morgan');
	const mongo = require('mongodb');
	const bodyParser = require('body-parser');
	const MongoClient = mongo.MongoClient;



/* Server Variables */
	const MongoURL = process.env.MONGO_URL;



/* Routes */
	var indexRouter = require('./routes/index');
	var debugRouter = require('./routes/debug');
	var usersRouter = require('./routes/users');



/* Initializing App */
	var app = express();



/* CORS - Must change to custom on deploy */
 	app.use(cors());


/* View Engine Setup */
	app.set('views', path.join(__dirname, 'views'));
	app.set('view engine', 'jade');

	app.use(logger('dev'));
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({ extended: false }));
	app.use(cookieParser());
	app.use(favicon(path.join(__dirname, 'public','images','icons','favicon.ico')));
	app.use(express.static(path.join(__dirname, 'public')));



/* App Debug Routing */
	app.use('/', (process.env.NODE_ENV) == 'development' ? debugRouter : indexRouter);
	app.use('/users', usersRouter);



/* MongoClient Init */
	MongoClient.connect(MongoURL, { useNewUrlParser: true }, function(err, client) {
		if (err) {
			console.log(`Failed to connect to the database. ${err.stack}`);
		}
		var db = client.db('study_dump');
		app.set('db', db);
		console.log(`Node.js app is listening to MongoServer`);
	});



/* catch 404 and forward to error handler */
	app.use(function(req, res, next) {
	  next(createError(404));
	});



/* error handler */
	app.use(function(err, req, res, next) {
	  // set locals, only providing error in development
	  res.locals.message = err.message;
	  res.locals.error = req.app.get('env') === 'development' ? err : {};

	  // render the error page
	  res.status(err.status || 500);
	  res.render('error');
	});



module.exports = app;
