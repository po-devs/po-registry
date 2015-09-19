var express = require('express');

var app = express();

console.log(__dirname + '/public');
app.use("/public", express.static(__dirname + '/public'));

app.get("/", function(req, res) {
    res.render("index.kiwi", {param:"value"});
});

app.get("/admin", function(req, res) {
    res.render("admin.kiwi", {bannedips:["666.666.666.666", "12.34.56.78"]});
});

app.listen(1234);