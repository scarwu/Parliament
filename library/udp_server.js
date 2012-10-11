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

var udp_server = dgram.createSocket("udp4");

udp_server.on('message', function(message, remote) {
	var status = global.parliament;
	var data = JSON.parse(message);
	
	switch(data.action) {
		// Check server is alive or not
		case 'heartbeat':
			var message = new Buffer(JSON.stringify({
				'status': 'alive'
			}));
			udp_server.send(message, 0, message.length, config.udp_port, remote.address);
			break;

		// New request join group
		case 'join':
			// is init and is leader
			if(status.is_init && status.is_leader) {
				status.member[data.hash] = {
					'role': 'member',
					'hash': data.hash,
					'ip': remote.address
				}
				console.log(status.member);
				
				// Send Command: Accept
				var message = new Buffer(JSON.stringify({
					'action': 'accept',
					'hash': config.hash,
					'member': status.member
				}));
				udp_server.send(message, 0, message.length, config.udp_port, remote.address);
				console.log('Send Command: Accept');
				
				// Send Command: Refresh
				var message = new Buffer(JSON.stringify({
					'action': 'refresh',
					'hash': config.hash,
					'member': status.member
				}));
				udp_server.setBroadcast(true);
				udp_server.send(message, 0, message.length, config.udp_port, config.broadcast);
				console.log('Send Command: Refresh');
			}
			break;

		// Accept new node join group
		case 'accept':
			// is not init
			if(!status.is_init) {
				status.is_init = true;
				status.member = data.member;
				console.log('Set role: Member');
				console.log(status.member);
			}
			break;

		// Quit group
		case 'quit':
			// IP is not same, is init
			if(remote.address != config.address && status.is_init) {
				delete status.member[data.hash];
				
				if(data.leader == config.hash) {
					status.is_leader = true;
					status.member[config.hash]['role'] = 'leader';

					// Send Command: Refresh
					var message = new Buffer(JSON.stringify({
						'action': 'refresh',
						'hash': config.hash,
						'member': status.member
					}));
					udp_server.setBroadcast(true);
					udp_server.send(message, 0, message.length, config.udp_port, config.broadcast);
					console.log('Send Command: Refresh');
				}
				
				console.log(remote.address + ' was Quit');
				console.log(status.member);
			}
			break;

		// Refresh list
		case 'refresh':
			// is init
			if(status.is_init) {
				status.member = data.member;
				console.log('Refresh Member List');
				console.log(status.member);
			}
			break;
		default:
			console.log('Undefined command.');
	}
});

udp_server.on('error', function() {
	
});

function start() {
	udp_server.bind(config.udp_port, config.network);
}

function stop() {
	udp_server.close();
}
