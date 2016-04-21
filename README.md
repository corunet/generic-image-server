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

For all the configurations, you need to edit the `config.js` file.

1. Edit the **imagepath** with the path of the images you want to serve.
2. Configure a Redis server, and edit the **config.redis attributes**  with the parameters of your server.
3. The server is listening by default on port 3003. You can change it editing the **config.default.port**.
4. You can specify a max resolution editing **config.default.xmax** and **config.default.ymax**.

## Usage
With your Redis Server running: 
```sh
    $ git clone https://github.com/alopezsanchez/generic-image-server.git && cd generic-image-server
    $ npm install
    $ node images.js
```

## Examples

- `localhost:3003/400/400/image2.jpg`
- `localhost:3003/1200/1200/image2.jpg?fit=true`
- `localhost:3003/400/400/image2.jpg?force=true`
- `localhost:3003/400/400/image2.jpg?fit=true&force=true`
