# Generic Image Server with Node.js

## Description
Image server implemented with Node.js. The server provides an image and resize it maintaining its aspect ratio.
You need to specify a image resolution in order to resize it.

By default, if the original image resolutions is smaller than the requested one, it cannot be extended. To force the extend, you must specify in the url a parameter **force=true**.

You can also crop the image with the resolution requested in the url. To do that, you need to specify a **fit=true** at url parameters.

## Prerequisites
 - [Git](https://git-scm.com/)
 - [Node.js and npm](nodejs.org)
 - [Redis](http://redis.io/)
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
  --redisHost, -h  Redis server hostname  [string] [default: "localhost"]
  --redisPort, -o  Redis server port  [number] [default: 6379]
  --redisTTL, -t   Redis cache TTL  [number] [default: 3600]

Opciones:
  --help  Show help  [boolean]
```


## Usage
With your Redis Server running: 
```sh
    $ git clone https://github.com/alopezsanchez/generic-image-server.git && cd generic-image-server
    $ npm install
    $ node images.js /path/to/image/repository
```
There's also a `systemd` service file example included. You may want to edit it and change `ExecStart` and/or `User`.

## Examples

- `localhost:3003/400/400/image2.jpg`
- `localhost:3003/1200/1200/image2.jpg?fit=true`
- `localhost:3003/400/400/image2.jpg?force=true`
- `localhost:3003/400/400/image2.jpg?fit=true&force=true`
