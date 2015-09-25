var config = {};

config.registry = {};
config.web = {};
config.antispam = {};

config.web.port = 1234;
config.web.user = "admin";
config.web.password = "admin";
config.web.webclient = "http://webclient.pokemon-online.eu/";

config.antispam.logins = 10;
config.antispam.requests = 40;
config.antispam.byterate = 100*1000;

module.exports = config;