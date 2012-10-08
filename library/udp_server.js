'use strict'

// Require module
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
		case 'heartbeat':
			var message = new Buffer(JSON.stringify({
				'status': 'alive'
			}));
			udp_server.send(message, 0, message.length, config.udp_port, remote.address);
			break;
		case 'join':
			// is init and is leader
			if(status.is_init && status.is_leader) {
				status.member[remote.address] = {
					'role': 'member',
					'hash': data.hash
				}
				console.log(status.member);
				
				// Accept
				var message = new Buffer(JSON.stringify({
					'action': 'accept',
					'member': status.member
				}));
				udp_server.send(message, 0, message.length, config.udp_port, remote.address);
				console.log('Send Command: Accept');
				
				// Refresh
				var message = new Buffer(JSON.stringify({
					'action': 'refresh',
					'member': status.member
				}));
				udp_server.setBroadcast(true);
				udp_server.send(message, 0, message.length, config.udp_port, config.broadcast);
				console.log('Send Command: Refresh');
			}
			
			// is not init, IP is true and hash is same
			if(!status.is_init && remote.address in config.ip_list && data.hash == config.hash)
				config.address = remote.address;
			break;
		case 'accept':
			// is not init
			if(!status.is_init) {
				status.is_init = true;
				status.member = data.member;
				console.log('Set role: Member');
				console.log(status.member);
			}
			break;
		case 'quit':
			// IP is not same, is init
			if(remote.address != config.address && status.is_init) {
				delete status.member[remote.address];
				
				if(data.leader == config.address) {
					status.is_leader = true;
					status.member[config.address]['role'] = 'leader';
					var message = new Buffer(JSON.stringify({
						'action': 'refresh',
						'member': status.member
					}));
					udp_server.setBroadcast(true);
					udp_server.send(message, 0, message.length, config.udp_port, config.broadcast);
					console.log('Send Command: Refresh');
				}
				
				console.log(remote.address + ' was Quit');
			}
			break;
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

