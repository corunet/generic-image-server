[![Codacy Badge](https://api.codacy.com/project/badge/Grade/3a56a16945604be0b9ee7c8b5c4df99d)](https://www.codacy.com/app/alopezsanchez/generic-image-server?utm_source=github.com&utm_medium=referral&utm_content=alopezsanchez/generic-image-server&utm_campaign=badger)
[![npm version](https://badge.fury.io/js/generic-image-server.svg)](https://badge.fury.io/js/generic-image-server)
[![Open Source Helpers](https://www.codetriage.com/alopezsanchez/generic-image-server/badges/users.svg)](https://www.codetriage.com/alopezsanchez/generic-image-server)
# Generic Image Server with Node.js

## Description
Image server implemented with Node.js. The server provides an image and resize it maintaining its aspect ratio.
You need to specify a image resolution in order to resize it.

By default, if the original image resolutions is smaller than the requested one, it cannot be extended. To force the extend, you must specify in the url a parameter **force=true**.

You can also crop the image with the resolution requested in the url. To do that, you need to specify a **fit=true** at url parameters.

## Prerequisites
 - [Git](https://git-scm.com/)
 - [Node.js and npm](https://nodejs.org/en/)
 - [Redis](http://redis.io/) (optional)
 - [ImageMagick](http://www.imagemagick.org/script/index.php)

## Configuration

You can customize the service through command line arguments:

```sh
Usage: images.js [options] pathToImageFolder

Image service
  --port, -p  Port number the service will listen to  [number] [default: 3002]
  --yMax, -y  Maximum height  [number] [default: 1200]
  --xMax, -x  Maximum width  [number] [default: 1200]

Redis cache
  --cache,     -c  Redis use [boolean] [default: true]
  --redisHost, -h  Redis server hostname  [string] [default: "localhost"]
  --redisPort, -o  Redis server port  [number] [default: 6379]
  --redisTTL,  -t  Redis cache TTL  [number] [default: 3600]

Opciones:
  --help  Show help  [boolean]
```

## Usage
With your Redis Server running:
```sh
    $ npm install generic-image-server && cd node_modules/generic-image-server
    $ npm install
    $ node images.js --no-cache /path/to/image/repository
```

## Examples

- `localhost:3002/400/400/images/image2.jpg`
- `localhost:3002/1200/1200/images/image2.jpg?fit=true`
- `localhost:3002/400/400/images/image2.jpg?force=true`
- `localhost:3002/400/400/images/image2.jpg?fit=true&force=true`
