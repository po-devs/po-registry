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
var clientserv2 = net.createServer(clientListener);
var serverserv = net.createServer(serverListener);

var servs = [clientserv, clientserv2, serverserv];

servs.forEach(function(serv) {
    serv.on('error', function (e) {
        if (e.code == 'EADDRINUSE') {
            console.log('Port in use, failure...');
            // setTimeout(function () {
            //     server.close();
            //     server.listen(PORT, HOST);
            // }, 1000);
        }
    });
});

clientserv.listen(5090, function() { //'listening' listener
    console.log('Client listener 1 working on port 5090');
});

clientserv2.listen(8080, function() { //'listening' listener
    console.log('Client listener 2 working on port 8080');
});

serverserv.listen(8081, function() {
    console.log("Server listener working on port 8081");
});