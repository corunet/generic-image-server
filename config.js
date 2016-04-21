var config = {};

config.redis = {};
config.default = {};
config.mime = {};

config.default.imagepath  = "/path/to/your/folder/";
config.default.xmax = 1200;
config.default.ymax = 1200;
config.default.port = 3001;

config.redis.port = 6379;
config.redis.host = '127.0.0.1';
config.redis.ttl = 3600;

module.exports = config;
