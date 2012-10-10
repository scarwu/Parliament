'use strict'

// Require module
var fs = require('fs');
var net = require('net');
var util = require('util');
var dgram = require('dgram');

var mysql = require('mysql-libmysqlclient');

// Require custom module
var config = require('../config');

// Module Exports
exports.start = start;
exports.stop = stop;

// File system extend
fs.copy = function (src, dst, callback) {
	function copy(error) {
		var input_stream;
		var output_stream;

		if (!error) {
			return callback(new Error("File " + dst + " exists."));
		}

		fs.stat(src, function (error) {
			if (error)
				return callback(error);

			input_stream = fs.createReadStream(src);
			output_stream = fs.createWriteStream(dst);
			util.pump(input_stream, output_stream, callback);
		});
	}

	fs.stat(dst, copy);
};

var tcp_server = net.createServer(function(socket) {
// MySQL Connection
	
	// Receive Data and Handle
	socket.on('data', function(message) {
		var conn = mysql.createConnectionSync();
		// conn.connectSync(config.db.host + ':' + config.db.port, config.db.user, config.db.pass, config.db.name);

		var status = global.parliament;
		var data = JSON.parse(message);
		
		if(!status.is_init)
			return false;
		
		switch(data.action) {
			// List server status
			case 'list':
				socket.write(JSON.stringify(status.member));
				socket.pipe(socket);
				break;

			// Delete file
			case 'delete':
				var path = config.target + data.path;
				if(fs.existsSync(path))
					fs.unlink(path);
				break;

			// Backup file
			case 'backup':
				var path = config.target + data.path;
				var client = net.connect({
					'port': config.tcp_port,
					'host': remote.address
				}, function() {
					client.write(JSON.stringify({
						'action': 'read',
						'path': data.path
					}));
				});
				
				client.on('data', function(data) {
					fs.write(path, data.toString(), function(error, data) {
						client.end();
					});
				});

				break;

			// Create file
			case 'create':
				var path = config.target + data.path;
				fs.copy(data.src, path, function() {

				});
				break;

			// Read file
			case 'read':
				var path = config.target + data.path;
				if(fs.existsSync(path))
					fs.readFile(path, null, function(error, data) {
						socket.write(data);
						socket.pipe(socket);
					});
				else {
					
				}
				break;

			default:
				console.log('Undefined command.');
		}

	    if(conn.connectedSync())
			conn.closeSync();
	});
	
	socket.on('error', function() {
		
	});
	
});

function start() {
	tcp_server.listen(config.tcp_port);
}

function stop() {
	tcp_server.close();
}
