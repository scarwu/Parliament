'use strict'

// Require module
var net = require('net');

// Require custom module
var config = require('../config');

// Module Exports
exports.start = start;

var tcp_server = net.createServer(function(socket) {
	
	// Receive Data and Handle
	socket.on('data', function(message) {
		var status = global.parliament;
		var data = JSON.parse(message);
		
		switch(data.action) {
			case 'list':
				if(status.is_init) {
					socket.write(JSON.stringify(status.member));
					socket.pipe(socket);
				}
				break;
			default:
				console.log('Undefined command.');
		}
	    
	});
	
});

function start() {
	tcp_server.listen(config.tcp_port);
}
