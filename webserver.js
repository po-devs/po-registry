var express = require('express');

var app = express();

console.log(__dirname + '/public');
app.use("/public", express.static(__dirname + '/public'));

app.get("/", function(req, res) {
    res.render("index.kiwi");
});

app.get("/admin", function(req, res) {
    res.render("admin.kiwi");
});

app.listen(1234);