var net = require('net');

function clientListener(c) {
    console.log('client connected');
    c.on('end', function() {
        console.log('client disconnected');
    });
    //c.write('hello\r\n');
    //c.pipe(c);  
}

function serverListener(s) {
    console.log("server connected");
    c.on('end', function() {
        console.log('server disconnected');
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