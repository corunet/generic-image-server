#!/usr/bin/env node

var fs = require('fs'),
	gm = require('gm').subClass({
		imageMagick: true
	}),
	http = require('http'),
	express = require('express'),
	buffer = require('buffer'),
	redis = require('redis'),
	config = require('./config'),
	app = express(),
	client = redis.createClient(config.redis.port, config.redis.host, { 'return_buffers': true }),
	port = config.default.port,
	mime = {
		"jpeg": "image/jpeg",
		"jpg": "image/jpeg",
		"png": "image/png",
		"gif": "image/gif"
	},
	// global variable used as a "mutex" for the image
	// if the server is processing an image, it block it
	process = {};

client.on('connect', function () {
	console.log('Connected to Redis Server\n');
});


app.use(function (request, response, next) {
	app.locals.hostname = (request.headers.host.match(/:/g)) ? request.headers.host.slice(0, request.headers.host.indexOf(":")) : request.headers.host;
	next();
});


function showImage(url, response, completePath, width, height, ext, fit, force) {
	return new Promise((resolve, reject) => {
		var widthResize = width;
		var heightResize = height;
		response.writeHead(200, {
			"Content-Type": mime[ext]
		});

		var imagen = gm(completePath); //create resized image
		imagen.size(function (err, size) {
			if (!err) {
				var originalRatio = size.width / size.height;
				var newRatio = width / height;
				var isSmaller = false; 
				
				// if original image is lower than the requested one, it can be extended
				if (size.width < width && size.height < height) {
					isSmaller = true;
				};

				if (fit === 'true') {
					if (originalRatio > newRatio) { // limita the height
						widthResize = null;
					} else { // limit the width
						heightResize = null;
					}

					if (!isSmaller) {
						// if the parameter of the gm.resize() is null, it resize keeping the aspect ratio
						imagen.resize(widthResize, heightResize);
					}
					else if (force === 'true' && isSmaller) {
						imagen.resize(widthResize, heightResize);
					}

					imagen.gravity('Center')
						.crop(width, height);
				} else {
					// the original image only can be extended if force is true
					if (!isSmaller) {
						imagen.resize(width, height);
					}
					else if (force === 'true' && isSmaller) {
						imagen.resize(width, height);
					}
				}

			} else {
				reject(err);
				response.statusCode = 500;
				response.end();

				return;
			}

			imagen.noProfile();
			imagen.stream(function (error, stdout, stdin) {
				if (error) {
					reject('ERROR 1' + error);
					response.statusCode = 500;
					response.end();
					return;
				}

				try {
					stdout.pipe(response);

				} catch (e) {
					reject('ERROR 2' + e);
					response.statusCode = 500;
					response.end();
					return;
				}

				var buf = new Buffer('');
				stdout.on('data', function (chunk) {
					buf = Buffer.concat([buf, chunk]);
				});
				stdout.on('end', function () {
					client.setex(url, config.redis.ttl, buf);
					resolve(buf);
				});
				stdout.on('error', function (error) {
					reject('ERROR 3' + error);
					stdout.end();
					response.statusCode = 500;
					response.end();

					stdout.end();
				})

			});
		});
	});
}


function cache(url, response, completePath, width, height, ext, fit, force) {
	return new Promise((resolve, reject) => {
		// check if the path is a file system or a uri
		if (completePath.indexOf("http://") > -1) {
			http.get(completePath, function (res) {
				showImage(url, response, completePath, width, height, ext, fit, force).then(resolve, reject);
			}).on('error', function (e) {
				response.end();
				reject(e.message);
			})
		}
		else {
			fs.readFile(completePath, function (error, data) {
				if (!error) {
					showImage(url, response, completePath, width, height, ext, fit, force).then(resolve, reject);
				} else {
					response.statusCode = 404;
					response.end();
					reject("ERROR obtaining image" + completePath + "\n");
				}
			});
		}
	});
}


app.get('/:x/:y/:param1/:param2', function (request, response) {

	// local variables
	var param1 = request.params.param1;
	var param2 = request.params.param2;
	var width = request.params.x;
	var height = request.params.y;
	var fit = request.query.fit;
	var force = request.query.force;


	// config variables
	var imagepath = config.default.imagepath;
	var widthmax = config.default.xmax;
	var heightmax = config.default.ymax;

	// limit max width and height
	if (width > widthmax) //max width
		width = widthmax;
	if (height > heightmax) //max height
		height = heightmax;

	var ext = param2.split('.').pop();

	var completePath = imagepath + param1 + '/' + param2;
	var url = encodeURI(request.url);

	// search in Redis if the url requested is cached
	client.get(url, function (err, value) {
		if (!err) {
			response.set('Content-type', mime[ext.toLowerCase]);

			if (value === null) { // image not cached
				// if the image is being processed, the server block it until process[url] doesnt exist
				// With the use of promises, we ensure the image is not being processed more than one at a time
				if (process[url]) {
					process[url].then((img) => {
						response.end(img);
					}, (reason) => {
						console.error("ERROR. Waiting a traitment", reason);
						response.statusCode = 500;
						response.end();
					});
				} else {
					process[url] = cache(url, response, completePath, width, height, ext, fit, force);
					process[url].catch((reason) => {
						console.error(reason);
					}).then(function () {
						delete process[url];
					});
				}
			} else {
				response.send(value);
			}
		}
		else {
			console.error("ERROR reading from redis", err);
			response.statusCode = 500;
			response.end();
		}
	});
});

app.listen(port);
console.log('Application listen on port %d...', port);