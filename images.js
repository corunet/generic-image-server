#!/usr/local/bin/node

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
	};

client.on('connect', function () {
	console.log('Connected to Redis Server\n');
});


app.use(function (request, response, next) {
	app.locals.hostname = (request.headers.host.match(/:/g)) ? request.headers.host.slice(0, request.headers.host.indexOf(":")) : request.headers.host;
	next();
});


function showImage (url, response, completePath, width, height, ext, fit, force) {
	
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
			}
			else {
				// the original image only can be extended if force is true
				if (!isSmaller) {
					imagen.resize(width, height);
				}
				else if (force === 'true' && isSmaller) {
					imagen.resize(width, height);
				}
			}

		};

		imagen.noProfile();
		imagen.stream(function (error, stdout, stdin) {
			try {
				stdout.pipe(response);

			} catch (e) {
				console.log(e);
			}
			var buf = new Buffer('');
			stdout.on('data', function (chunk) {
				buf = Buffer.concat([buf, chunk]);
			});
			stdout.on('end', function () {
				var ttl= 3600;
				client.setex(url, ttl, buf);
			});

		});
	});
}


function cache(url, response, completePath, width, height, ext, fit, force) {

	// check if the path is a file system or a uri
	if (completePath.indexOf("http://") > -1) { 
		http.get(completePath, function (res) {
			showImage(url, response, completePath, width, height, ext, fit, force);
		});
	}
	else {
		fs.readFile(completePath, function (error, data) {
			console.log(completePath+'\n');
			if (!error) {
				showImage(url, response, completePath, width, height, ext, fit, force);

			} else {
				response.statusCode = 404;
				response.end();
				console.log("ERROR obtaining image\n");
			}
		});
	}



}

app.get('/:x/:y/:param1/:param2', function (request, response) {

	console.log('New Request');

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

	var name = param2.split('.')[0];
	var fullname = encodeURIComponent(name);
	var ext = param2.split('.').pop();

	console.log(fullname + '.' + ext);

	var completePath = imagepath + param1 + '/' + param2;
	var url = encodeURI(request.url);
	console.log(url);

	// search in Redis if the url requested is cached
	client.get(url, function (err, value) {
		if (value === null) { // image not cached
			console.log('Image not cached');
			cache(url, response, completePath, width, height, ext, fit, force);
		} else {
			console.log('Image cached\n');
			response.set('Content-type', mime[ext.toLowerCase]);
			response.send(value);
		}
	});

});

app.listen(port);
console.log('Application listen on port %d...', port);