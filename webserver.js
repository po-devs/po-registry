var redis = require("redis"),
    redisClient = redis.createClient();

var express = require('express');

var app = express();

var servers = {}

console.log(__dirname + '/public');
app.use("/public", express.static(__dirname + '/public'));

app.get("/", function(req, res) {
    res.render("index.kiwi", {servers: servers});
});

app.get("/admin", function(req, res) {
    res.render("admin.kiwi", {servers: servers, bannedips:["666.666.666.666", "12.34.56.78"]});
});

app.get("/servers.json", function(req, res) {
	res.send(JSON.stringify(servers));
});

app.listen(1234);

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