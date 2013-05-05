/**
 * UDP Server
 * 
 * @package		Parliament
 * @author		ScarWu
 * @copyright	Copyright (c) 2012-2013, ScarWu (http://scar.simcz.tw/)
 * @license		https://github.com/scarwu/Parliament/blob/master/LICENSE
 * @link		https://github.com/scarwu/Parliament
 */

'use strict'

// Require module
var dgram = require('dgram');

// Require custom module
var config = require('../config');
var udp_handler = require('./udp_handler');

var udp_server = dgram.createSocket("udp4");

udp_server.on('message', function(message, remote) {
	try {
		var data = JSON.parse(message);
		
		if(data.action in udp_handler)
			udp_handler[data.action](data, udp_server, remote);
	}
	catch(error) {
		console.log(error);
		console.log(message.toString());
	}
});

// Module Exports
exports.start = function() {
	udp_server.bind(config.udp_port, config.network);
}

exports.stop = function() {
	udp_server.close();
}