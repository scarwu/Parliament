'use strict'

// Require module
var fs = require('fs');
var net = require('net');
var dgram = require('dgram');

// Require custom module
var config = require('../config');

// Module Exports
exports.start = start;
exports.stop = stop;

var tcp_server = net.createServer(function(socket) {
	
	// Receive Data and Handle
	socket.on('data', function(message) {
		var status = global.parliament;
		var data = JSON.parse(message);
		
		if(!status.is_init)
			return false;
		
		switch(data.action) {
			case 'list':
				socket.write(JSON.stringify(status.member));
				socket.pipe(socket);
				break;
			case 'delete':
				var path = config.target + data.path;
				fs.exists(path, function(exists) {
					if(exists)
						fs.unlink(path);
				});
				break;
			case 'distribute':
				var path = config.target + data.path;
				
				break;
			case 'backup':
				var path = config.target + data.path;
				
				break;
			case 'create':
				var path = config.target + data.path;
				// None
				break;
			case 'read':
				var path = config.target + data.path;
				fs.exists(path, function(exists) {
					if(exists)
						fs.readFile(path, null, function(error, data) {
							socket.write(data);
							socket.pipe(socket);
						});
				});
				break;
			default:
				console.log('Undefined command.');
		}
	    
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
