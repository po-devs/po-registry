var net = require('net');
var redis = require("redis"),
    redisClient = redis.createClient();
var analyze = require("./analyzepacket");
var extend = require("extend");
var limiter = require("limiter");
var fs = require("fs");

var announcement = "";
var bannedIps = [];


redisClient.on("error", function (err) {
    console.log("Redis Error: " + err);
});


var servers = {};
var names = {};
var antidos = {};
var ipcount = {};

function initIp(ip) {
    if (! (ip in antidos) ) {
        // new client / server! Limit to 40 messages/logins per minute
        // only cache per day
        antidos[ip] = { "logins"  : new limiter.RateLimiter(10, 'minute', true),
                        "requests": new limiter.RateLimiter(40, 'minute', true),
                        "byterate": new limiter.RateLimiter(100*1000, 'minute', true)};
        setTimeout(function() {
            delete antidos[ip];
        }, 24*60*60*1000);
    }
}

function canLogin(c) {
    var ip = c.remoteAddress;
    initIp(ip);

    return antidos[ip].logins.tryRemoveTokens(1);
};

function canReceive(c) {
    var ip = c.remoteAddress;
    initIp(ip);

    return antidos[ip].requests.tryRemoveTokens(1);
};

function canReceiveBytes(c, bytes) {
    initIp(c.remoteAddress);
    return antidos[c.remoteAddress].byterate.tryRemoveTokens(bytes);
};

function incIp(ip) {
    ipcount[ip] = (ipcount[ip] || 0) + 1; 
}

function decIp(ip) {
    ipcount[ip] = (ipcount[ip] || 0) - 1;
    if (ipcount[ip] <= 0) {
        delete ipcount[ip];
    }
}

function clientListener(c) {
    try {
        var ip = c.remoteAddress;
        if (!canLogin(c)) {
            c.destroy();
            return;
        }
        if (bannedIps.indexOf(ip) != -1) {
            console.log("Banned client attempting to log in: " + ip);
            c.destroy();
            return;
        }
        if (ipcount[ip] > 5) {
            c.destroy();
            return;
        }
        incIp(ip);

        console.log('client connected');
        c.on('close', function() {
            decIp(ip);
            console.log('client disconnected');
        });
        c.on('error', function() {
        });

        if (announcement) {
            analyze.write(c, "announcement", announcement);
        }
        //todo: cache the binary data?
        for(name in names) {
            analyze.write(c, "server", names[name].podata);
        };

        analyze.write(c, "serverend");

        c.end();
    } catch(err) {
        fs.appendToFile("reg-errors.txt", err + "\n");
        fs.appendToFile("reg-errors.txt", err.stack + "\n");
    }
}

function serverListener(s) {
    s.on('error', function() {});

    if (!canLogin(s)) {
        s.destroy();
        return;
    }

    var id = s.remoteAddress;

    if (!id || bannedIps.indexOf(id) != -1) {
        console.log("Banned server attempting to log on: " + id);
        s.destroy();
        return;
    }
    if (ipcount[id] > 5) {
        s.destroy();
        return;
    }
    incIp(id);
    
    console.log("server " + id + " connected");

    var disconnected = false;
    s.dc = function() {
        disconnected = true;
        s.end();
    }
    if (id in servers) {
        //Todo: send error message to server
        console.log("IP already in use, disconnecting");
        s.dc();
        return;
    }
    servers[id] = s;
    s.podata = {"name": "", "ip": s.remoteAddress};
    s.setKeepAlive(true);
    s.on('close', function() {
        console.log('server ' + id + ' disconnected');
        delete servers[id];
        decIp(id);
        if (s.podata.name in names && names[s.podata.name] == s) {
            delete names[s.podata.name];
        }
        analyze.disconnect(s);
    });
    s.on('data', function(data) {
        //Ignore data from connections we closed
        if (disconnected) {
            return;
        }
        if (!canReceiveBytes(s, data.length)) {
            console.log("Server " + id + " sent too many bytes, disconnecting");
            s.dc();
            return;
        }
        //console.log("Server " + id + " sent data of length " + data.length);
        analyze.addData(s, data, function(s, command) {
            if (!canReceive(s)) {
                console.log("Server " + id + " sent too many packets, disconnecting");
                s.dc();
                return;
            }
            console.log("Server " + id + " sent command " + JSON.stringify(command));

            if ("name" in command && command.name.length > 20) {
                command.name = command.name.substring(0, 20);
            }
            if ("desc" in command && command.desc.length > 500) {
                command.desc = command.desc.substring(0, 500);
            }

            var oldName = s.podata.name;
            extend(s.podata, command);

            if (s.podata.name !== oldName) {
                delete names[oldName];

                if (s.podata.name in names) {
                    console.log("Name already in use, disconnecting");
                    //Todo: send error message to server
                    s.dc();
                    return;
                }

                if (s.podata.name.length > 0) {
                    names[s.podata.name] = s;
                }
            }

            if (s.podata.name.length == 0) {
                console.log("Empty name, disconnecting");
                //Todo: send error message to server
                s.dc();
                return;
            }
        });
    });
}

var clientserv = net.createServer(clientListener); 
clientserv.potag = {name: "Client serv 1", port: 5090};
var clientserv2 = net.createServer(clientListener); 
clientserv2.potag = {name: "Client serv 2", port: 8080};
var serverserv = net.createServer(serverListener); 
serverserv.potag = {name: "Server serv", port: 8081};

var servs = [clientserv, clientserv2, serverserv];

servs.forEach(function(serv) {
    serv.on('error', function (e) {
        if (e.code == 'EADDRINUSE') {
            console.log(serv.potag.name + ': Port ' + serv.potag.port + ' in use, failure... Retrying in 10 seconds');
            setTimeout(function () {
                 //serv.close();
                 serv.listen(serv.potag.port);
            }, 10000);
        }
    });
});

clientserv.listen(clientserv.potag.port, function() { //'listening' listener
    console.log('Client listener 1 working on port 5090');
});

clientserv2.listen(clientserv2.potag.port, function() { //'listening' listener
    console.log('Client listener 2 working on port 8080');
});

serverserv.listen(serverserv.potag.port, function() {
    console.log("Server listener working on port 8081");
});

/* Update the announcement every 10 seconds */
function updateAnnouncement() {
    redisClient.get("po-registry:announcement", function(err, ann) {
        if (err) {
            console.log("Redis error when getting announcement");
        } else if (announcement != ann) {
            console.log("Announcement updated: " + ann);
        } else  {
            //console.log("no update");
        }
        announcement = ann;
        setTimeout(updateAnnouncement, 10000);
    });
}
updateAnnouncement();

/* Update the banned IPs every 10 seconds */
function updateBannedIPs() {
    redisClient.smembers("po-registry:banned-ips", function(err, banned) {
        if (err) {
            console.log("Redis error when getting banned ips");
        } else {
            bannedIps = banned;
            bannedIps.forEach(function(ip) {
                if (ip in servers) {
                    servers[ip].dc();
                }
            });  
        }
        
        setTimeout(updateBannedIPs, 10000);
    });
}
updateBannedIPs();
