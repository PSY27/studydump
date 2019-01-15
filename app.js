/* Import Declarations */
	const createError = require('http-errors');
	const express = require('express');
	const path = require('path');
	const favicon = require('serve-favicon');
	const cookieParser = require('cookie-parser');
	const logger = require('morgan');
	const bodyParser = require('body-parser');
	const mongo = require('mongodb');



/* Routes */
	var indexRouter = require('./routes/index');
	var debugRouter = require('./routes/debug');
	var usersRouter = require('./routes/users');



/* Initializing App */
	var app = express();



/* Environment Selection (development | production) */
	process.env.NODE_ENV = 'production';



/* View Engine Setup */
	app.set('views', path.join(__dirname, 'views'));
	app.set('view engine', 'jade');

	app.use(logger('dev'));
	app.use(express.json());
	app.use(express.urlencoded({ extended: false }));
	app.use(cookieParser());
	// app.use(favicon('/public/images/favicon.ico'));
	app.use(express.static(path.join(__dirname, 'public')));

	
	
/* App Routing */
	app.use('/', (process.env.NODE_ENV) == 'development' ? debugRouter : indexRouter);
	app.use('/users', usersRouter);

	
	
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
