var redis = require("redis"),
    redisClient = redis.createClient();

var express = require('express');

var basicAuth = require('basic-auth');

var fs = require('fs');

var config = require('./config.js');

var app = express();

var servers = {}

var bannedIps = [];

console.log(__dirname + '/public');
app.use("/public", express.static(__dirname + '/public'));

// simple logger
app.use(function(req, res, next){
  console.log('%s %s', req.method, req.url);
  next();
});

// Synchronous
var auth = function (req, res, next) {
  function unauthorized(res) {
    res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
    return res.sendStatus(401);
  };

  var user = basicAuth(req);

  if (!user || !user.name || !user.pass) {
    return unauthorized(res);
  };

  if (user.name === config.web.user && user.pass === config.web.password) {
    return next();
  } else {
    return unauthorized(res);
  };
};

app.get("/", function(req, res) {
  res.render("index.kiwi", {servers: servers, webclient: config.web.webclient});
});

app.get("/admin", auth, function(req, res) {
  res.render("admin.kiwi", {servers: servers, bannedips:bannedIps});
});

app.get("/servers.json", function(req, res) {
  res.send(JSON.stringify(servers));
});

app.get("/ban", auth, function(req, res) {
  redisClient.sadd("po-registry:banned-ips", req.query.ip, redis.print);
  res.sendStatus(200);

  fs.appendFile("reg-authlog.txt", "ban " + req.query.ip + ", source: " + req.ip  + "/" + req.hostname + "\n");
});

app.get("/unban", auth, function(req, res) {
  console.log(JSON.stringify(req.query));
  redisClient.srem("po-registry:banned-ips", req.query.ip, redis.print);
  res.sendStatus(200);

  fs.appendFile("reg-authlog.txt", "unban " + req.query.ip + ", source: " + req.ip  + "/" + req.hostname + "\n");
});

app.listen(config.web.port);

/* Update the list of servers from the database every 5 seconds */
function updateServers() {
  redisClient.get("po-registry:servers", function(err, servs) {
    if (err) {
      console.log("Redis error when getting servers");
    } else {
      servers = JSON.parse(servs);
    }
    
    setTimeout(updateServers, 5000);
  });
}
updateServers();


/* Update the banned IPs every 3 seconds */
function updateBannedIPs() {
    redisClient.smembers("po-registry:banned-ips", function(err, banned) {
        if (err) {
            console.log("Redis error when getting banned ips");
        } else {
            bannedIps = banned;
        }
        
        setTimeout(updateBannedIPs, 3000);
    });
}
updateBannedIPs();

