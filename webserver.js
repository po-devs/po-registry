import { createClient } from "redis";
import express from "express";
import { engine } from "express-handlebars";
import basicAuth from "basic-auth";
import fs from "fs";
import url from "url";
import config from "./app/config.js";

const app = express();

let servers = {};
let bannedIps = [];

const redisClient = createClient();

redisClient.connect();

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

app.use("/public", express.static(__dirname + "/public"));
app.engine("handlebars", engine());
app.set("view engine", "handlebars");

// simple logger
app.use(function (req, res, next) {
	console.log(req.method, req.url);
	next();
});

// Synchronous
function auth(req, res, next) {
	function unauthorized(res) {
		res.set("WWW-Authenticate", "Basic realm=Authorization Required");
		return res.sendStatus(401);
	}

	var user = basicAuth(req);

	if (!user || !user.name || !user.pass) {
		return unauthorized(res);
	}

	if (user.name === config.web.user && user.pass === config.web.password) {
		return next();
	} else {
		return unauthorized(res);
	}
}

app.get("/", function (req, res) {
	res.render("index.handlebars", {
		servers: servers,
		hasServers: servers.length > 0,
		webclient: config.web.webclient,
	});
});

app.get("/admin", auth, function (req, res) {
	res.render("admin.handlebars", {
		servers: servers,
		bannedips: bannedIps.sort(function (a, b) {
			var parts1 = a.split(".");
			var parts2 = b.split(".");

			for (var i = 0; i < parts1.length && i < parts2.length; i++) {
				if (parts1[i] != parts2[i]) {
					return +parts1[i] - +parts2[i];
				}
			}

			return parts1.length - parts2.length;
		}),
	});
});

app.get("/servers.json", function (req, res) {
	res.json(servers);
});

app.get("/ban", auth, function (req, res) {
	redisClient.sAdd("po-registry:banned-ips", req.query.ip, redis.print);
	res.sendStatus(200);

	fs.appendFile("reg-authlog.txt", "ban " + req.query.ip + ", source: " + req.ip + "/" + req.hostname + "\n");
});

app.get("/unban", auth, function (req, res) {
	console.log(JSON.stringify(req.query));
	redisClient.sRem("po-registry:banned-ips", req.query.ip, redis.print);
	res.sendStatus(200);

	fs.appendFile("reg-authlog.txt", "unban " + req.query.ip + ", source: " + req.ip + "/" + req.hostname + "\n");
});

app.listen(config.web.port);

/* Update the list of servers from the database every 5 seconds */
function updateServers() {
	redisClient.get("po-registry:servers").then((servs) => {
		servers = JSON.parse(servs);
	});
}
setInterval(updateServers, 5_000);

/* Update the banned IPs every 3 seconds */
function updateBannedIPs() {
	redisClient
		.sMembers("po-registry:banned-ips")
		.then((banned) => {
			bannedIps = banned;
		})
		.catch(console.error);
}
setInterval(updateServers, 3_000);

process.on("unhandledRejection", (error) => {
	// Will print "unhandledRejection err is not defined"
	console.log("unhandledRejection", error.message);
});
