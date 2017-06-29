#!/usr/bin/env node

const argv = require('yargs')
  .usage('Usage: $0 [options] pathToImage')
  .demand(1, 1)
  .options({
    'port': {
      alias: 'p',
      describe: 'Port number the service will listen to',
      type: 'number',
      group: 'Image service',
      default: 3002
    },
    'yMax': {
      alias: 'y',
      describe: 'Maximum height',
      type: 'number',
      group: 'Image service',
      default: 1200
    },
    'xMax': {
      alias: 'x',
      describe: 'Maximum width',
      type: 'number',
      group: 'Image service',
      default: 1200
    },
    'redisHost': {
      alias: 'h',
      describe: 'Redis server hostname',
      type: 'string',
      group: 'Redis cache',
      default: 'localhost'
    },
    'redisPort': {
      alias: 'o',
      describe: 'Redis server port',
      type: 'number',
      group: 'Redis cache',
      default: 6379
    },
    'redisTTL': {
      alias: 't',
      describe: 'Redis cache TTL',
      type: 'number',
      group: 'Redis cache',
      default: 3600
    }
  })
  .help()
  .argv;

const basePath = argv._;

const consoleOptions = {
  colors: {
    stamp: 'yellow'
  }
};

require('console-stamp')(console, consoleOptions);

var fs = require('fs'),
  gm = require('gm').subClass({imageMagick: true}),
  http = require('http'),
  express = require('express'),
  redis = require('redis'),
  app = express(),
  client = redis.createClient(argv.redisPort, argv.redisHost, {'return_buffers': true}),
  redisConnection,
  mime = {
    'jpeg': 'image/jpeg',
    'jpg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif'
  },
  // global variable used as a 'mutex' for the image if the server is processing
  // an image, it block it
  process = {};

client.on('connect', () => {
  redisConnection = true;
  console.log('Connected to Redis Server\n');
});

client.on('error', () => {
  redisConnection = false;
});

app.use((request, response, next) => {
  app.locals.hostname = (request.headers.host.match(/:/g)) ? request.headers.host.slice(0, request.headers.host.indexOf(':')) : request.headers.host;
  next();
});

function showImage(url, response, completePath, width, height, ext, fit, force) {
  return new Promise((resolve, reject) => {
    var widthResize = width;
    var heightResize = height;
    response.writeHead(200, {'Content-Type': mime[ext]});

    var imagen = gm(completePath); //create resized image
    imagen.size(function (err, size) {
      if (!err) {
        var originalRatio = size.width / size.height;
        var newRatio = width / height;
        var isSmaller = false;

        // if original image is lower than the requested one, it can be extended
        if (size.width < width && size.height < height) {
          isSmaller = true;
        }

        if (fit === 'true') {
          if (originalRatio > newRatio) { // limita the height
            widthResize = null;
          } else { // limit the width
            heightResize = null;
          }

          if (!isSmaller) {
            // if the parameter of the gm.resize() is null, it resize keeping the aspect
            // ratio
            imagen.resize(widthResize, heightResize);
          } else if (force === 'true' && isSmaller) {
            imagen.resize(widthResize, heightResize);
          }

          imagen
            .gravity('Center')
            .crop(width, height);
        } else {
          // the original image only can be extended if force is true
          if (!isSmaller) {
            imagen.resize(width, height);
          } else if (force === 'true' && isSmaller) {
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
      imagen.stream(function (error, stdout) {
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
          if (redisConnection) {
            client.setex(url, argv.redisTTL, buf);
          }
          resolve(buf);
        });
        stdout.on('error', function (error) {
          reject('ERROR 3' + error);
          stdout.end();
          response.statusCode = 500;
          response.end();

          stdout.end();
        });

      });
    });
  });
}

function cache(url, response, completePath, width, height, ext, fit, force) {
  return new Promise((resolve, reject) => {
    // check if the path is a file system or a uri
    if (completePath.indexOf('http://') > -1) {
      http
        .get(completePath, function () {
          showImage(url, response, completePath, width, height, ext, fit, force).then(resolve, reject);
        })
        .on('error', function (e) {
          response.end();
          reject(e.message);
        });
    } else {
      fs
        .readFile(completePath, function (error) {
          if (!error) {
            showImage(url, response, completePath, width, height, ext, fit, force).then(resolve, reject);
          } else {
            response.statusCode = 404;
            response.end();
            reject('ERROR obtaining image ' + completePath + '\n');
          }
        });
    }
  });
}

app
  .get('/:x/:y/:param1/:param2', function (request, response) {

    // local variables
    var param1 = request.params.param1;
    var param2 = request.params.param2;
    var width = request.params.x;
    var height = request.params.y;
    var fit = request.query.fit;
    var force = request.query.force;

    // limit max width and height
    if (width > argv.xmax) //max width
      width = argv.xmax;
    if (height > argv.ymax) //max height
      height = argv.ymax;

    var ext = param2
      .split('.')
      .pop();

    var completePath = basePath + param1 + '/' + param2;
    var url = encodeURI(request.url);

    // search in Redis if the url requested is cached
    if (redisConnection) {
      client
        .get(url, function (err, value) {
          if (!err) {
            response.set('Content-type', mime[ext.toLowerCase]);

            if (value === null) { // image not cached
              checkTraitment();
            } else {
              response.send(value);
            }
          } else {
            console.error('ERROR reading from redis', err);
            response.statusCode = 500;
            response.end();
          }
        });
    } else {
      // if no Redis connection, just serve the image
      checkTraitment();
    }

    function checkTraitment() {
      // if the image is being processed, the server block it until process[url]
      // doesnt exist With the use of promises, we ensure the image is not being
      // processed more than one at a time
      if (process[url]) {
        process[url].then((img) => {
          response.end(img);
        }, (reason) => {
          console.error('ERROR. Waiting a traitment', reason);
          response.statusCode = 500;
          response.end();
        });
      } else {
        process[url] = cache(url, response, completePath, width, height, ext, fit, force);
        process[url].catch((reason) => {
          console.error(reason);
        })
          .then(function () {
            delete process[url];
          });
      }
    }

  });

app.listen(argv.port, function () {
  console.log('Application listen on port %d...', argv.port);
});