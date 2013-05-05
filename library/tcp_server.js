/**
 * TCP Server
 * 
 * @package		Parliament
 * @author		ScarWu
 * @copyright	Copyright (c) 2012-2013, ScarWu (http://scar.simcz.tw/)
 * @license		https://github.com/scarwu/Parliament/blob/master/LICENSE
 * @link		https://github.com/scarwu/Parliament
 */

'use strict'

// Require module
var net = require('net');

// Require custom module
var config = require('../config');
var tcp_handler = require('./tcp_handler');

var tcp_server = net.createServer(function(socket) {
	socket.on('data', function(message) {
		try {
			var data = JSON.parse(message);

			if(global._status.is_init && data.action in tcp_handler)
				tcp_handler[data.action](data, socket);
		}
		catch(error) {
			console.log(error);
			console.log(message.toString());
		}
	});
});

// Module Exports
exports.start = function() {
	tcp_server.listen(config.tcp_port);
}

exports.stop = function() {
	tcp_server.close();
}