var sets = require("simplesets");

var data = {};
/* Temporary cache of disconnected sockets - so we don't continue to handle requests of those */
var disconnected = new sets.Set();

function addData(s, newdata, callback) {
    var fulldata = s in data ? Buffer.concat(data[s], newdata) : newdata;
    
    /* Todo: instead of creating a new buffer for each command, keep offset in memory and only
        create a new buffer every X or so bytes */
    while(1) {
        var length = fulldata.readUInt32BE(0);
        var fullength = length + 4;

        if (fulldata.length >= fullength) {
            analyze(s, fulldata, callback);

            delete data[s];
            
            if (fulldata.length == fullength) {
                break;
            } else if (!disconnected.has(s)) {
                newbuf = new Buffer(fulldata.length - fullength);
                fulldata.copy(newbuf, 0, fullength);

                fulldata = newbuf;
            }
        } else {
            data[s] = fulldata;
            break;
        }
    }

    //Unfortunately, no clear function yet in the lib
    if (disconnected.size() > 0) {
        disconnected = new sets.Set();
    }
}

function disconnect(s) {
    if (s in data) {
        delete data[s];
    }
    disconnected.add(s);
}

function BufferWrapper(buf) {
    this.offset = 0;
    this.buf = buf;
}

BufferWrapper.prototype.readBool = function() {
    var ret = this.buf.readUInt8(this.offset, true);
    this.offset++;
    return ret ? true : false;
};

BufferWrapper.prototype.readUInt8 = function() {
    var ret = this.buf.readUInt8(this.offset, true);
    this.offset++;
    return ret;
};

BufferWrapper.prototype.readUInt16 = function() {
    var ret = this.buf.readUInt16BE(this.offset, true);
    this.offset += 2;
    return ret;
};

BufferWrapper.prototype.readUInt32 = function() {
    var ret = this.buf.readUInt32BE(this.offset, true);
    this.offset += 4;
    return ret;
};

BufferWrapper.prototype.readString = function() {
    var len = this.readUInt32();
    var str = this.buf.toString("utf8", this.offset, this.offset+len);
    this.offset += len;
    return str;
};

var commandAnalyzers = {};

function analyze(s, fulldata, callback) {
    var buf = new BufferWrapper(fulldata);
    var len = buf.readUInt32();
    var command = buf.readUInt8();

    if (command in commandAnalyzers) {
        callback(s, commandAnalyzers[command](buf));
    }
}

commandAnalyzers[1] = function(buf) {
    return {
        "type" : "serverinit",
        "name" : buf.readString(),
        "desc" : buf.readString(),
        "players" : buf.readUInt16(),
        "maxplayers" : buf.readUInt16(),
        "port": buf.readUInt16(),
        "password-protected": buf.readBool()
    };
};

commandAnalyzers[17] = function(buf) {
    return {
        "type" : "playercount-update",
        "players": buf.readUInt16()
    };
};

commandAnalyzers[18] = function(buf) {
    return {
        "type" : "serverdesc-update",
        "desc": buf.readString()
    };
};

commandAnalyzers[19] = function(buf) {
    return {
        "type" : "servername-update",
        "name": buf.readString()
    };
};

commandAnalyzers[35] = function(buf) {
    return {
        "type" : "serversize-update",
        "maxplayers": buf.readUInt16()
    };
};

commandAnalyzers[59] = function(buf) {
    return {
        "type" : "serverpass-update",
        "password-protected": buf.readBool()
    };
};

module.exports = {
    addData: addData,
    disconnect: disconnect
};