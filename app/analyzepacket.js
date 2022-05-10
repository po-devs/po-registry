var data = {};
/* Temporary cache of disconnected sockets - so we don't continue to handle requests of those */
var disconnected = new Set();

function addData(s, newdata, callback) {
	var id = s.remoteAddress;
	var fulldata = id in data ? Buffer.concat([data[id], newdata]) : newdata;

	/* Todo: instead of creating a new buffer for each command, keep offset in memory and only
        create a new buffer every X or so bytes */
	while (1) {
		if (fulldata.length < 4) {
			data[id] = fulldata;
			break;
		}
		var length = fulldata.readUInt32BE(0);
		var fullength = length + 4;

		if (fullength > 100 * 1000) {
			/* No reason to read packets so big */
			s.dc();
			return;
		}

		if (fulldata.length >= fullength) {
			analyze(s, fulldata, callback);

			delete data[id];

			if (fulldata.length == fullength) {
				break;
			} else if (!disconnected.has(s)) {
				newbuf = Buffer.alloc(fulldata.length - fullength);
				fulldata.copy(newbuf, 0, fullength);

				fulldata = newbuf;
			}
		} else {
			data[id] = fulldata;
			break;
		}
	}

	if (disconnected.size() > 0) {
		disconnected.clear();
	}
}

function disconnect(s) {
	if (s in data) {
		delete data[s.remoteAddress];
	}
	disconnected.add(s);
}

function BufferWrapper(buf) {
	this.offset = 0;
	if (typeof buf == "number") {
		this.buf = new Buffer(buf);
	} else {
		this.buf = buf;
	}
}

BufferWrapper.prototype.readBool = function () {
	var ret = this.buf.readUInt8(this.offset, true);
	this.offset++;
	return ret ? true : false;
};

BufferWrapper.prototype.readUInt8 = function () {
	var ret = this.buf.readUInt8(this.offset, true);
	this.offset++;
	return ret;
};

BufferWrapper.prototype.readUInt16 = function () {
	var ret = this.buf.readUInt16BE(this.offset, true);
	this.offset += 2;
	return ret;
};

BufferWrapper.prototype.readUInt32 = function () {
	var ret = this.buf.readUInt32BE(this.offset, true);
	this.offset += 4;
	return ret;
};

BufferWrapper.prototype.readString = function () {
	var len = this.readUInt32();
	var str = this.buf.toString("utf8", this.offset, this.offset + len);
	this.offset += len;
	return str;
};

BufferWrapper.prototype.writeBool = function (data) {
	this.buf.writeUInt8(data ? 1 : 0, this.offset++);
};

BufferWrapper.prototype.writeUInt8 = function (data) {
	this.buf.writeUInt8(data, this.offset++);
};

BufferWrapper.prototype.writeUInt16 = function (data) {
	this.buf.writeUInt16BE(data, this.offset);
	this.offset += 2;
};

BufferWrapper.prototype.writeUInt32 = function (data) {
	this.buf.writeUInt32BE(data, this.offset);
	this.offset += 4;
};

BufferWrapper.prototype.writeString = function (data) {
	var len = this.buf.write(data, this.offset + 4);
	this.buf.writeUInt32BE(len, this.offset);
	this.offset += 4 + len;
};

var commandAnalyzers = {};
var commandWriters = {};

function analyze(s, fulldata, callback) {
	var buf = new BufferWrapper(fulldata);
	var len = buf.readUInt32();
	var command = buf.readUInt8();

	if (command in commandAnalyzers) {
		callback(s, commandAnalyzers[command](buf));
	}
}

commandAnalyzers[1] = function (buf) {
	return {
		type: "serverinit",
		name: buf.readString(),
		desc: buf.readString(),
		players: buf.readUInt16(),
		maxplayers: buf.readUInt16(),
		port: buf.readUInt16(),
		"password-protected": buf.readBool(),
	};
};

commandAnalyzers[17] = function (buf) {
	return {
		type: "playercount-update",
		players: buf.readUInt16(),
	};
};

commandAnalyzers[18] = function (buf) {
	return {
		type: "serverdesc-update",
		desc: buf.readString(),
	};
};

commandAnalyzers[19] = function (buf) {
	return {
		type: "servername-update",
		name: buf.readString(),
	};
};

commandAnalyzers[35] = function (buf) {
	return {
		type: "serversize-update",
		maxplayers: buf.readUInt16(),
	};
};

commandAnalyzers[59] = function (buf) {
	return {
		type: "serverpass-update",
		"password-protected": buf.readBool(),
	};
};

function writeCommand(c, command, data) {
	if (command in commandWriters) {
		commandWriters[command](c, data);
	} else {
		console.log("Unknown command: " + command);
	}
}

commandWriters["announcement"] = function (c, announcement) {
	var strlen = Buffer.byteLength(announcement, "utf8");
	var totallen = 4 + 1 + 4 + strlen;
	var buf = new BufferWrapper(totallen);
	buf.writeUInt32(totallen - 4);
	buf.writeUInt8(38);
	buf.writeString(announcement);
	c.write(buf.buf);
};

commandWriters["server"] = function (c, server) {
	var lens = Buffer.byteLength(server.name) + Buffer.byteLength(server.desc) + Buffer.byteLength(server.ip);
	//    notify(PlayersList, name, desc, numplayers, ip, max, port, passwordProtected);
	var totallen = 4 + 1 + 4 + 4 + 2 + 4 + 2 + 2 + 1 + lens;
	var buf = new BufferWrapper(totallen);
	buf.writeUInt32(totallen - 4);
	buf.writeUInt8(5);
	buf.writeString(server.name);
	buf.writeString(server.desc);
	buf.writeUInt16(server.players);
	buf.writeString(server.ip);
	buf.writeUInt16(server.maxplayers);
	buf.writeUInt16(server.port == 0 ? 5080 : server.port);
	buf.writeBool(server["password-protected"]);
	c.write(buf.buf);
};

commandWriters["serverend"] = function (c) {
	var buf = new BufferWrapper(5);
	buf.writeUInt32(1);
	buf.writeUInt8(57);
	c.write(buf.buf);
};

export default {
	addData: addData,
	disconnect: disconnect,
	write: writeCommand,
};
