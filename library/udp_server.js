'use strict'

// Require module
var dgram = require('dgram');

// Require custom module
var config = require('../config');
var udp_handler = require('./udp_handler');

var udp_server = dgram.createSocket("udp4");

udp_server.on('message', function(message, remote) {
	var data = JSON.parse(message);
	
	if(data.action in udp_handler)
		udp_handler[data.action](data, udp_server, remote);
});

// Module Exports
exports.start = function() {
	udp_server.bind(config.udp_port, config.network);
}

exports.stop = function() {
	udp_server.close();
}