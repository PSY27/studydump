/* Import Declarations */
	var express = require('express');
	var router = express.Router();
	var path = require('path');
	var mongodb = require('mongodb');
	var MongoClient = mongodb.MongoClient;
	var assert = require('assert');
	var fs = require('fs');
	var jwt = require('jsonwebtoken');
	var multer  =   require('multer');
	var gm = require('gm').subClass({ imageMagick: true });
	var filepreview = require('filepreview-es6');
	var storage = multer.diskStorage({
		destination: (req, file, cb) => {
			cb(null, storageURL)
		},
		filename: (req, file, cb) => {
			cb(null, (file.originalname.substring(0, file.originalname.indexOf('.')).sanitise().indentFix() + '-' + Date.now() + file.originalname.substring(file.originalname.indexOf('.'), file.originalname.length)));
		}
	});
	var upload = multer({ storage : storage }).single('uploadFile');
	var bulk = multer({ storage : storage }).array('bulkUpload',50);



/* Custom Variables */
	var storageURL = 'public/images/uploads';
	var structURL = require(path.resolve('custom_imports/structure.json'));
	var thumbURL = 'public/images/thumbs';
	var staticThumbURL = 'public/images/thumbs/static';
	
	var infoDB = 'info';
	var timestampDB = 'timestamp';
	var logDB = 'act_log';
	
	var Options = require(path.resolve('custom_imports/Options'));
	
	
	
/*---------- Temporary solution : To be replaced by environment keys (Probably by automation) ----------*/

	var privateKEY  = fs.readFileSync(path.resolve('JWTKeys/private.key'), 'utf8');
	var publicKEY  = fs.readFileSync(path.resolve('JWTKeys/public.key'), 'utf8');



	/* Preprocessing jobs */
		if (!fs.existsSync(storageURL)){
			fs.mkdirSync(storageURL);
		}

/*----------------------------------------------------------------------------------------------------------------------*/



/* Functions */
	// Recursive Dictionary Key Call
		var getKey = function(currkey, callback) {
			if(typeof currkey === 'object') {
				for(var i in currkey) {
					return getKey(currkey[i]);
				}
			}
			else {
					return currkey;
			}
		}



	// Resolve JWT Token (remove BEARER if exists)
		var resolveToken = function(feed, callback) {
			if(feed.startsWith('Bearer')) {
				return feed.split(' ')[1];
			}
			else {
				return feed;
			}
		}



	// User input integrity check function group
		String.prototype.sanitise = function(rep='') {															// Sanitises string (Illegal characters replaced by replacement safe character)
			return this.replace(/[|&;$%@"<>()+,]/g, rep).toString();
		}
		
		String.prototype.toNum = function() {																		// Removes every character that isn't numerical
			return this.replace(/[^0-9]/g, "").toString();
		}
		
		String.prototype.stringFix = function() {																	// Converts input string to lowercase (for consistency)
			return this.toLowerCase().toString();
		}
		
		String.prototype.indentFix = function(rep='_') {														// Replaces indent (space, tab, newline) with defined replacement character (for URLs mainly)
			return this.replace(/\s/g, rep).toString();
		}



	// Check if feed exists, if not, return specified string
		var checkReturn = function(feed, spec, callback) {
			if(feed) return feed
			else return spec
		}



	// Get FileName from Path (replace timestamp)
		var getFileName = function(path, callback) {
			return path.replace(/.*\//, '').replace(/\-(?!.*\-).*?(?=\.)/, '');
		}
		//[^\/]+(?=\-)|(?=\.).*    to get name without timestamp with extention



	// Authenticate JWT
		var verifyToken = function(feedToken) {
			
			try {
				if(!feedToken) throw err
			}
			catch (err) {
				console.log('\x1b[31m', 'Error :: No token provided with call', '\n\r\x1b[0m');
				return false;
			}
			
			var token = resolveToken(feedToken);
			
			try {
				jwt.verify(token, publicKEY, Options.signOptions, function(err, decoded) {
					if(decoded) {
						console.log('\x1b[32m', 'Success :: Token authorized', '\n\r\x1b[0m');
					}
					else {
						throw err;
					}
				});
				return true;
			}
			catch (err) {
				console.log('\x1b[31m', 'Error :: Couldn\'t authenticate token', '\n\r\x1b[0m');
				return false;
			}
		}



	// Activity Logging
		var addLog = function(action, desc, db, callback) {
			
			var feed = {Action: action, Description: desc, Timestamp: Date.now()};
			
			db.insert(feed, function(err, result) {
				if(err) {
					console.log('\x1b[31m', 'Error :: Can\'t insert into database\n', err, '\n\r\x1b[0m');
				}
				else {
					console.log('\x1b[32m', 'Success :: Inserted into database', '\n\r\x1b[0m');
				}
			});
		}



	// Creating thumbnails
		var assignThumb = (file, done) => {
			let inFile = storageURL + '/' + file.filename.indentFix();
			let thumbName =file.filename.indentFix().substring(0, file.filename.indexOf('.'));
			let thumbLoc = thumbURL + '/' + thumbName + '_thumb.jpg';
			
			return filepreview.generateAsync(inFile, thumbLoc, Options.thumbOptions)
			.then( (response) => {
				console.log('\x1b[36m', 'Info :: Response recieved\n', response, '\n\r\x1b[0m');
				if(response.thumbnail == 'undefined') {
					console.log('\x1b[36m', 'Info :: Assigning respective pseudo thumbnail', '\n\r\x1b[0m');
					let statThumb = staticThumbURL + '/' + path.extname(inFile).toLowerCase().replace('.', '') +'.png';
					try {
						if (fs.existsSync(statThumb)) {
							return {thumbnail: statThumb};
						}
						else {
							return {thumbnail: staticThumbURL + '/common.png'};
						}
					}
					catch(err) {
						console.error(err)
					}
				}
				else {
					return response;
				}
			})
			.catch( error => {
				console.log('\x1b[31m', 'Error :: Caught an error while creating thumbnails\n', error, '\n\r\x1b[0m');
				console.log('\x1b[36m', 'Info :: Assigning respective pseudo thumbnail', '\n\r\x1b[0m');
				let statThumb = staticThumbURL + '/' + path.extname(inFile).toLowerCase().replace('.', '') +'.png';
				try {
					if (fs.existsSync(statThumb)) {
						return {thumbnail: statThumb};
					}
					else {
						console.log('\x1b[36m', 'Info :: Couldn\'t find suitable icon. Dropping to default icon', '\n\r\x1b[0m');
						return {thumbnail: staticThumbURL + '/common.png'};
					}
				}
				catch(err) {
					console.log('\x1b[31m', 'Error :: Caught an error while creating thumbnails\n', err, '\n\r\x1b[0m');
				}
			});
		}
		
		
/*------------------------------------------------ Thumbnail Procedure Kernel---------------------------------------------------<PLZ PRESERVE>------------------------------------------------------------------------
	// Creating thumbnails
		var assignThumb = function(file) {
			var catagory = file.mimetype.split('/')[0];
			var thumbName = file.filename.substring(0, file.filename.indexOf('.')) + '_thumb.jpg';	//append _thumb to filename
			if(catagory == 'image') {
				try {
					gm(storageURL+'/'+file.filename)
						.resize("100^", "100^")
						.gravity('Center')
						.crop(100, 100)
						.write(thumbURL+'/'+thumbName, (err) => {
							if (err) {
								throw err;
							}
							else {
								console.log('\x1b[32m', 'Success :: Created thumbnail', '\n\r\x1b[0m');
							}
						});
						return (thumbURL+'/'+thumbName);
				}
				catch (err) {
					console.log('\x1b[31m', 'Error :: Couldn\'t create thumbnail\n', err, '\n\r\x1b[0m');
					return err;
				}
			}
			else if(catagory == 'video') {
				try {
					var proc = new ffmpeg({source: storageURL+'/'+file.filename})
						.on('end', function() {
							console.log('\x1b[32m', 'Success :: Created thumbnail', '\n\r\x1b[0m');
						})
						.on('error', function(err) {
							throw err;
						})
						.takeScreenshots({ count: 1, timemarks: [ '5' ], filename: '%b_thumb.jpg' }, thumbURL);
				}
				catch (err) {
					console.log('\x1b[31m', 'Error :: Couldn\'t create thumbnail\n', err, '\n\r\x1b[0m');
					return err;
				}
				return (thumbURL+'/'+thumbName);
			}
			else if(catagory == 'text') {
				
			}
			else if(catagory == 'application') {															//see individually
				
			}
			else {																									//chemical,x-conference												//assign corresponding thumbnail from thumbnailArchive
				
			}
		}
------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/



/* Generate JWT */
	router.post('/getToken', function(req, res, next) {
		var logger = req.app.get('db').collection(logDB);
		
		if(true) {																																				//AUTH ONLY FOR HIGH ACCESS
			var payload = {
				name: req.body.name.sanitise(),
				email: req.body.email.sanitise()
			};

			var token = jwt.sign(payload, privateKEY, Options.signOptions);
			console.log("Token: ", token);
			res.status(200).send(token);
			addLog('Token generated', token, logger);
		}
		else {
			console.log('\x1b[31m', 'Error :: Authentication Failure', '\n\r\x1b[0m');
			res.status(401).send('Couldn\'t authenticate connection');
		}
	});



/*	Structure JSON Return Route */
	router.get('/getStructure', function(req, res) {
		var logger = req.app.get('db').collection(logDB);
		
		if(verifyToken(req.get('Authorization'))) {
			console.log('\x1b[36m', 'Info :: Sending structure', '\n\r\x1b[0m');
			res.status(200).json(structURL);
			addLog('Structure called', resolveToken(req.get('Authorization')), logger);
		}
		else {
			console.log('\x1b[31m', 'Error :: Authentication Failure', '\n\r\x1b[0m');
			res.status(401).send('Couldn\'t authenticate connection');
		}
	});

	
	
/* Upload File Route */
	router.post('/uploadFile', function(req, res){
		
		var info = req.app.get('db').collection(infoDB);
		var timestamp = req.app.get('db').collection(timestampDB);
		var logger = req.app.get('db').collection(logDB);
		
		if(verifyToken(req.get('Authorization'))) {
				
			upload(req, res, function(err) {
				if(err) {
					console.log('\x1b[31m', 'Error :: File couldn\'t be uploaded\n', err, '\n\r\x1b[0m');
					res.status(500).send(err);
				}
				if(!req.file) {
					console.log('\x1b[31m', 'Error :: No file provided', '\n\r\x1b[0m');
					res.status(500).send('No file was sent');
				}
				else {
					info.find({FileName: req.file.originalname, FileType: req.file.mimetype, Size: req.file.size, Filters: {Year: checkReturn(req.body.year,'common').sanitise().toNum(), Branch: checkReturn(req.body.branch,'common').sanitise().stringFix(), Subject: checkReturn(req.body.subject,'common').sanitise().stringFix() }, IsNotif: req.body.notif}).toArray(function (err, result) {																											//duplicate check
						if (err) {
							console.log('\x1b[31m', 'Error :: Collection couldn\'t be read\n', err, '\n\r\x1b[0m');
							res.status(500).send(err);
						}
						else if (result.length) {
							console.log('\x1b[33m', 'Warning :: Duplicate document found', '\n\r\x1b[0m');
							 fs.unlink(storageURL+'/'+req.file.filename, function (err) {
								if (err) {
									console.log('\x1b[31m', 'Error :: Couldn\'t delete temporary file\nPlease approach manually\n', err, '\n\r\x1b[0m');
									res.status(500).send(err);
								}
								else {
									console.log('\x1b[36m', 'Info :: Fixed multiple uploads', '\n\r\x1b[0m');
									res.status(200).send('Duplicate Found');
								}
							});
						}
						else {
							assignThumb(req.file).then(function(thumbObj) {
								console.log('\x1b[36m', 'Info :: Thumbnail generated at\n', thumbObj.thumbnail, '\n\r\x1b[0m');
							
								var feed = {FileName: req.file.originalname, FileType: req.file.mimetype, Size: req.file.size, Filters: {Year: checkReturn(req.body.year,'common').sanitise().toNum(), Branch: checkReturn(req.body.branch,'common').sanitise().stringFix(), Subject: checkReturn(req.body.subject,'common').sanitise().stringFix() }, IsNotif: req.body.notif.sanitise().stringFix(), DownloadURL: storageURL+'/'+req.file.filename, ThumbnailURL: thumbObj.thumbnail, Counts: {DownloadCount: 0, CallCount: 0, LikeCount:0}, isAvailable: true};

								info.insertOne(feed, function(err, result) {
									if(err) {
										console.log('\x1b[31m', 'Error :: Can\'t insert into database\n', err, '\n\r\x1b[0m');
										res.status(500).send(err);
									}
									else {
										console.log('\x1b[32m', 'Success :: Inserted into database', '\n\r\x1b[0m');
										
										addLog('File uploaded', result.ops[0]._id.toString(), logger);
										
										timec = Date.now();
										
										var year = 'Year.'+checkReturn(req.body.year,'common').sanitise().toNum();
										var branch = 'Branch.'+checkReturn(req.body.branch,'common').sanitise().stringFix();
										var subject = 'Subject.'+checkReturn(req.body.subject,'common').sanitise().stringFix();
										
										var timefeed = {DB: timec, [year]: timec, [branch]: timec, [subject]: timec};
										if((req.body.notif) == 'true') {
											timefeed['Notif'] = timec;
										}
										
										timestamp.update({}, {$set: timefeed}, {upsert:true}, function(err, result) {
											if(err) {
												console.log('\x1b[31m', 'Error :: Can\'t update timestamp\n', err, '\n\r\x1b[0m');
												res.status(500).send(err);
											}
											else {
												console.log('\x1b[36m', 'Info :: Timestamp updated', '\n\r\x1b[0m');
												res.status(200).send("OK");
											}
										});
									}
								});
							});
						}
					});
				}
			});
		}
		else {
			console.log('\x1b[31m', 'Error :: Authentication Failure', '\n\r\x1b[0m');
			res.status(401).send('Couldn\'t authenticate connection');		
		}
	});



/* Bulk Upload Route */
	router.post('/bulkUpload', function(req, res){
		
		if(verifyToken(req.get('Authorization'))) {
			var info = req.app.get('db').collection(infoDB);
			var timestamp = req.app.get('db').collection(timestampDB);
			var logger = req.app.get('db').collection(logDB);
						
			bulk(req, res, function(err) {
				if(err) {
					console.log('\x1b[31m', 'Error :: File couldn\'t be uploaded\n', err, '\n\r\x1b[0m');
					res.status(500).send(err);
				}
				if(!req.files) {
					console.log('\x1b[31m', 'Error :: No files provided', '\n\r\x1b[0m');
					res.status(500).send('No file was sent');
				}
				else {
					req.files.forEach(function(doc) {
						info.find({FileName: doc.originalname, FileType: doc.mimetype, Size: doc.size, Filters: {Year: checkReturn(req.body.year,'common').sanitise().toNum(), Branch: checkReturn(req.body.branch,'common').sanitise().stringFix(), Subject: checkReturn(req.body.subject,'common').sanitise().stringFix() }, IsNotif: req.body.notif}).toArray(function (err, result) {																											//duplicate check
							if (err) {
								console.log('\x1b[31m', 'Error :: Collection couldn\'t be read\n', err, '\n\r\x1b[0m');
								if(!res.headersSent) res.status(500).send(err);
							}
							else if (result.length) {
								console.log('\x1b[33m', 'Warning :: Duplicate document found\n\r\x1b[0m');
								 fs.unlink(storageURL+'/'+doc.filename, function (err) {
									if (err) {
										console.log('\x1b[31m', 'Error :: Couldn\'t delete temporary file\nPlease approach manually\n', err, '\n\r\x1b[0m');
										if(!res.headersSent) res.status(500).send(err);
									}
									else {
										console.log('\x1b[36m', 'Info :: Fixed multiple uploads', '\n\r\x1b[0m');
										if(!res.headersSent) res.status(200).send('Duplicate Found');
									}
								});
							}
							else {

								assignThumb(doc).then(function(thumbObj) {
									console.log('\x1b[36m', 'Info :: Thumbnail generated at\n', thumbObj.thumbnail, '\n\r\x1b[0m');
								
									var feed = {FileName: doc.originalname, FileType: doc.mimetype, Size: doc.size, Filters: {Year: checkReturn(req.body.year,'common').sanitise().toNum(), Branch: checkReturn(req.body.branch,'common').sanitise().stringFix(), Subject: checkReturn(req.body.subject,'common').sanitise().stringFix() }, IsNotif: req.body.notif.sanitise().stringFix(), DownloadURL: storageURL+'/'+doc.filename, ThumbnailURL: thumbObj.thumbnail, Counts: {DownloadCount: 0, CallCount: 0, LikeCount:0}, isAvailable: true};						

									info.insertOne(feed, function(err, result) {
										if(err) {
											console.log('\x1b[31m', 'Error :: Can\'t insert into database\n', err, '\n\r\x1b[0m');
											if(!res.headersSent) res.status(500).send(err);
										}
										else {
											console.log('\x1b[32m', 'Success :: Inserted into database', '\n\r\x1b[0m');
											
											addLog('File uploaded', result.ops[0]._id.toString(), logger);
											
											timec = Date.now();

											var year = 'Year.'+checkReturn(req.body.year,'common').sanitise().toNum();
											var branch = 'Branch.'+checkReturn(req.body.branch,'common').sanitise().stringFix();
											var subject = 'Subject.'+checkReturn(req.body.subject,'common').sanitise().stringFix();
											
											var timefeed = {DB: timec, [year]: timec, [branch]: timec, [subject]: timec};
											if((req.body.notif) == 'true') {
												timefeed['Notif'] = timec;
											}
											
											timestamp.update({}, {$set: timefeed}, {upsert:true}, function(err, result) {
												if(err) {
													console.log('\x1b[31m', 'Error :: Can\'t update timestamp\n', err, '\n\r\x1b[0m');
													if(!res.headersSent) res.status(500).send(err);
												}
												else {
													console.log('\x1b[36m', 'Info :: Timestamp updated', '\n\r\x1b[0m');
													if(!res.headersSent) res.status(200).send("OK");
												}
											});
										}
									});
								});	
							}
						});
					});
				}
			});
		}
		else {
			console.log('\x1b[31m', 'Error :: Authentication Failure', '\n\r\x1b[0m');
			res.status(401).send('Couldn\'t authenticate connection');		
		}
	});



/* List Upload Route */
	router.get('/listUploads', function(req, res) {
		var feed = {};
		
		if(verifyToken(req.get('Authorization'))) {
			if(req.query.year) {
				feed["Filters.Year"] = req.query.year.sanitise().toNum();
			}
			if(req.query.branch) {
				feed["Filters.Branch"] = req.query.branch.sanitise().stringFix();
			}
			if(req.query.subject) {
				feed["Filters.Subject"] = req.query.subject.sanitise().stringFix();
			}
			if(req.query.type) {
				feed.FileType = req.query.type.sanitise().stringFix().replace('.','');
			}
			if(req.query.notif) {
				feed.IsNotif = (req.query.notif.sanitise().stringFix() == true);
			}
			if(!req.query.available) {
				feed.isAvailable = true;
			}
		
			var info = req.app.get('db').collection(infoDB);
			var timestamp = req.app.get('db').collection(timestampDB);
			var logger = req.app.get('db').collection(logDB);
					
			addLog('Uploads list sent', resolveToken(req.get('Authorization')), logger);
			
			var query = info.find(feed).sort({"Counts.LikeCount": -1, "Counts.DownloadCount": -1, "Counts.CallCount": -1, "_id": -1}).skip(req.query.page?parseInt((req.query.page_size?parseInt(req.query.page_size.sanitise().toNum(),10):10)*(req.query.page.sanitise().toNum()-1),10):0).limit((req.query.page_size)?parseInt(req.query.page_size.sanitise().toNum(),10):10);
	
			query.toArray(function (err, result) {
				if (err) {
					console.log('\x1b[31m', 'Error :: Collection couldn\'t be read\n', err, '\n\r\x1b[0m');
					res.status(500).send(err);
				}
				else if (result.length) {
					res.status(200).send(result);
					result.forEach(function(doc, key, result) {
						info.update({_id:doc._id}, { $inc: { "Counts.CallCount": 1} }, function(err) {
							if(err) {
								console.log('\x1b[31m', 'Error :: Query couldn\'t be executed\n', err, '\n\r\x1b[0m');
							}
							else {
								console.log('\x1b[36m', 'Info :: Call count updated', '\n\r\x1b[0m');
								console.log('\x1b[36m', 'Info :: Sending documents', '\n\r\x1b[0m');
							}
							if(Object.is(result.length, key)) {
								console.log('\x1b[36m', 'Info :: I was called now', '\n\r\x1b[0m');
							}
						});
					});
				}
				else {
					console.log('\x1b[36m', 'Info :: No documents found', '\n\r\x1b[0m');
					res.status(200).send("No documents found");
				}
			});
		}
		else {
			console.log('\x1b[31m', 'Error :: Authentication Failure', '\n\r\x1b[0m');
			res.status(401).send('Couldn\'t authenticate connection');
		}
	});

/* Update Like Count */
	router.post('/updateLike', function(req, res){
		
		if(verifyToken(req.get('Authorization'))) {
			var info = req.app.get('db').collection(infoDB);
			var timestamp = req.app.get('db').collection(timestampDB);
			var logger = req.app.get('db').collection(logDB);
					
			if(!mongodb.ObjectId.isValid(req.body.id)) {
				console.log('\x1b[31m', 'Error :: Invalid ObjectId supplied', '\n\r\x1b[0m');
				res.status(500).send("Invalid ObjectId");
			}
			else {
				info.findAndModify({'_id':new mongodb.ObjectID(req.body.id)}, {}, {$inc: {"Counts.LikeCount":1}}, {new: true},	function(err, result) {
					if(err) {
						console.log('\x1b[31m', 'Error :: Can\'t insert into database\n', err, '\n\r\x1b[0m');
						res.status(500).send(err);
					}
					else if(result.value != null) {
						console.log('\x1b[36m', 'Info :: Like count updated', '\n\r\x1b[0m');
						res.status(200).send("OK");
						addLog('Liked document', req.body.id, logger);
						
						timec = Date.now();

						var year = 'Year.'+checkReturn(result.value.Filters.Year,'common').sanitise().toNum();
						var branch = 'Branch.'+checkReturn(result.value.Filters.Branch,'common').sanitise().stringFix();
						var subject = 'Subject.'+checkReturn(result.value.Filters.Subject,'common').sanitise().stringFix();
						
						var timefeed = {DB: timec, [year]: timec, [branch]: timec, [subject]: timec};
						if((result.notif) == 'true') {
							timefeed['Notif'] = timec;
						}
						
						timestamp.update({}, {$set: timefeed}, {upsert:true}, function(err, result) {
							if(err) {
								console.log('\x1b[31m', 'Error :: Can\'t update timestamp\n', err, '\n\r\x1b[0m');
								if(!res.headersSent) res.status(500).send(err);
							}
							else {
								console.log('\x1b[36m', 'Info :: Timestamp updated', '\n\r\x1b[0m');
								if(!res.headersSent) res.status(200).send("OK");
							}
						});
					}
					else {
						console.log('\x1b[36m', 'Info :: Document not found', result, '\n\r\x1b[0m');
						res.status(200).send("Document moved...");
					}
				});
			}
		}
		else {
			console.log('\x1b[31m', 'Error :: Authentication Failure', '\n\r\x1b[0m');
			res.status(401).send('Couldn\'t authenticate connection');
		}
	});



/* Download File Route */
	router.get('/download', function(req, res) {
		var info = req.app.get('db').collection(infoDB);
		var timestamp = req.app.get('db').collection(timestampDB);
		var logger = req.app.get('db').collection(logDB);
		
		if(verifyToken(req.get('Authorization'))) {
			var file = Buffer.from(req.query.fURL, 'base64').toString('ascii');
			
			res.download(file, getFileName(file), function(err) {
				if(err) {
					console.log('\x1b[31m', 'Error :: File couldn\'t be retrieved\n', err, '\n\r\x1b[0m');
					if(!res.headersSent) res.status(500).send(err);
				}
				else {
					var info = req.app.get('db').collection(infoDB);
					var timestamp = req.app.get('db').collection(timestampDB);
					
					addLog('Downloaded document', resolveToken(req.get('Authorization')), logger);
					
					info.findAndModify({DownloadURL: file}, {}, { $inc: { "Counts.DownloadCount": 1} }, {new: true}, function(err, result) {
						if(err) {
							console.log('\x1b[31m', 'Error :: Query couldn\'t be executed\n', err, '\n\r\x1b[0m');
							if(!res.headersSent) res.status(500).send(err);
						}
						else if(result.value!=null){
							console.log('\x1b[36m', 'Info :: Download count updated', '\n\r\x1b[0m');
							
							timec = Date.now();

							var year = 'Year.'+checkReturn(result.value.Filters.Year,'common').sanitise().toNum();
							var branch = 'Branch.'+checkReturn(result.value.Filters.Branch,'common').sanitise().stringFix();
							var subject = 'Subject.'+checkReturn(result.value.Filters.Subject,'common').sanitise().stringFix();
							
							var timefeed = {DB: timec, [year]: timec, [branch]: timec, [subject]: timec};
							if((req.body.notif) == 'true') {
								timefeed['Notif'] = timec;
							}
							
							timestamp.update({}, {$set: timefeed}, {upsert:true}, function(err, result) {
								if(err) {
									console.log('\x1b[31m', 'Error :: Can\'t update timestamp\n', err, '\n\r\x1b[0m');
									if(!res.headersSent) res.status(500).send(err);
								}
								else {
									console.log('\x1b[36m', 'Info :: Timestamp updated', '\n\r\x1b[0m');
									if(!res.headersSent) res.status(200).send("OK");
								}
							});
						}
						else {
							console.log('\x1b[36m', 'Info :: Document not found', result, '\n\r\x1b[0m');
							if(!res.headersSent) res.status(200).send("Document moved...");							
						}
					});
					console.log('\x1b[36m', 'Info :: Downloading document', '\n\r\x1b[0m');
				}
			});
		}
		else {
			console.log('\x1b[31m', 'Error :: Authentication Failure', '\n\r\x1b[0m');
			res.status(401).send('Couldn\'t authenticate connection');
		}
	});



/* Last Modified Route */
	router.get('/lastModified', function(req, res) {
		var timestamp = req.app.get('db').collection(timestampDB);
		var logger = req.app.get('db').collection(logDB);
		
		var feed = {};
		
		if(verifyToken(req.get('Authorization'))) {
			feed['_id']=0;
			if(req.query.year) {
				feed['Year.'+req.query.year.sanitise().toNum()] = 1;
			}
			else if(req.query.branch) {
				feed['Branch.'+req.query.branch.sanitise().stringFix()] = 1;
			}
			else if(req.query.subject) {
				feed['Subject.'+req.query.subject.sanitise().stringFix()] = 1;
			}
			else if(req.query.notif) {
				feed['Notif'] = 1;
			}
			else {
				feed['DB'] = 1;
			}
		
			addLog('Last modified timestamp', resolveToken(req.get('Authorization')), logger);

			timestamp.find({}, feed).toArray(function (err, result) {
				if (err) {
					console.log('\x1b[31m', 'Error :: Collection couldn\'t be read\n', err, '\n\r\x1b[0m');
					res.status(500).send(err);
				}
				else if (getKey(result)) {
					console.log('\x1b[36m', 'Info :: Sent timestamp', result, '\n\r\x1b[0m');
					res.status(200).send(getKey(result).toString());
				}
				else {
					console.log('\x1b[36m', 'Info :: Not a field for timestamp', '\n\r\x1b[0m');
					if(!res.headersSent) res.status(400).send('Invalid return field');
				}
			});
		}
		else {
			console.log('\x1b[31m', 'Error :: Authentication Failure', '\n\r\x1b[0m');
			res.status(401).send('Couldn\'t authenticate connection');
		}
	});



module.exports = router;
