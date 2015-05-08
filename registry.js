var net = require('net');
var redis = require("redis"),
    redisClient = redis.createClient();
var analyze = require("./analyzepacket");

var announcement = "";

redisClient.on("error", function (err) {
    console.log("Redis Error: " + err);
});


var servers = {};

function freeid(dataSet) {
    for (var i = 1; ; i++) {
        if (! (i in dataSet)) {
            return i;
        }
    }
}

function clientListener(c) {
    console.log('client connected');
    c.on('end', function() {
        console.log('client disconnected');
    });
    //c.write('hello\r\n');
    //c.pipe(c);  
}

function serverListener(s) {
    var id = freeid(servers);
    console.log("server " + id + " connected");
    servers[id] = s;
    s.setKeepAlive(true);
    s.on('end', function() {
        console.log('server ' + id + ' disconnected');
        delete servers[id];
        analyze.disconnect(s);
    });
    s.on('data', function(data) {
        //console.log("Server " + id + " sent data of length " + data.length);
        analyze.addData(s, data, function(s, command) {
            console.log("Server " + id + " sent command " + JSON.stringify(command));
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
