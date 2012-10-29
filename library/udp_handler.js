'use strict'

// Require module
var dgram = require('dgram');

// Require custom module
var config = require('../config');
var assist = require('./assist');

// Module Exports
exports.heartbeat = function(data, socket, remote) {
	var status = global.parliament;

	if(!status.is_init || remote.address == config.address)
		return false;

	assist.log('--> UDP: Heartbeat');
	assist.log('<-- UDP: Heartbeat - Status: Alive');

	var message = new Buffer(JSON.stringify({
		'status': 'alive',
		'hash': config.hash
	}));
	socket.send(message, 0, message.length, config.udp_port, remote.address);
}

exports.join = function(data, socket, remote) {
	var status = global.parliament;
	
	// is init and is leader
	if(!status.is_init || !status.is_leader)
		return false;;

	assist.log('--> UDP: Join');

	status.member[data.hash] = {
		'is_leader': false,
		'hash': data.hash,
		'ip': remote.address
	}
	
	// Send Command: Accept
	var message = new Buffer(JSON.stringify({
		'action': 'accept',
		'hash': config.hash,
		'member': status.member
	}));
	socket.send(message, 0, message.length, config.udp_port, remote.address);
	assist.log('<-- UDP: Join - Accept');
	
	// Send Command: Refresh
	var message = new Buffer(JSON.stringify({
		'action': 'refresh',
		'hash': config.hash,
		'member': status.member
	}));
	socket.setBroadcast(true);
	socket.send(message, 0, message.length, config.udp_port, config.broadcast);
	assist.log('<-- UDP: Join - Refresh');

	assist.log('=== UDP: Join - IP: ' + remote.address);
	assist.list_member(status.member);
}

exports.accept = function(data, socket, remote) {
	var status = global.parliament;

	if(status.is_init)
		return false;;

	status.is_init = true;
	status.member = data.member;

	assist.log('--> UDP: Accept');
	assist.log('--> UDP: Accept - Set role: Member');
	assist.list_member(status.member);
}

// Quit group
exports.quit = function(data, socket, remote) {
	var status = global.parliament;

	if(remote.address == config.address || !status.is_init)
		return false;;

	delete status.member[data.hash];
	
	assist.log('--> UDP: Quit');

	if(data.leader == config.hash) {
		assist.log('--> UDP: Quit - Set role: Leader');

		status.is_leader = true;
		status.member[config.hash].is_leader = true;

		// Send Command: Refresh
		var message = new Buffer(JSON.stringify({
			'action': 'refresh',
			'hash': config.hash,
			'member': status.member
		}));
		socket.setBroadcast(true);
		socket.send(message, 0, message.length, config.udp_port, config.broadcast);
		assist.log('<-- UDP: Quit - Refresh');

		// Send Heartbeat
		assist.log('=== UDP: Heartbeat - Start');
		status.heartbeat_timer = setInterval(function() {
			assist.log('<-- UDP: Heartbeat');

			var message = new Buffer(JSON.stringify({
				'action': 'heartbeat'
			}));

			var client = dgram.createSocket("udp4");
			
			client.bind(config.udp_port);
			client.setBroadcast(true);
			client.send(message, 0, message.length, config.udp_port, config.broadcast, function(error, bytes) {
				setTimeout(function() {
					client.close();
				}, config.wait);
			});

			client.on('message', function(buffer, remote) {
				var data = JSON.parse(buffer.toString());
				if(data.status != undefined)
					assist.log('--> UDP: Heartbeat - Msg: ' + remote.address + ' ' + data.status);
			});
		}, config.heartbeat);
	}

	assist.log('=== UDP: Quit - IP: ' + remote.address);
	assist.list_member(status.member);
}

// Refresh list
exports.refresh = function(data, socket, remote) {
	var status = global.parliament;
	
	if(!status.is_init)
		return false;;

	status.member = data.member;

	assist.log('--> UDP: Refresh');
	assist.list_member(status.member);
}