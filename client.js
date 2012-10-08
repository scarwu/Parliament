#!/usr/bin/env node

var net = require('net');
var dgram = require('dgram');
var config = require('./config')

// Check argv
if(process.argv.length <= 3)
	process.exit();

switch(process.argv[3]) {
	case 'read':
		var client = net.connect({
			'port': config.tcp_port,
			'host': process.argv[2]
		}, function() {
			client.write(JSON.stringify({
				'action': 'read',
				'path': process.argv[4]
			}));
		});
		
		client.on('data', function(data) {
			console.log(data.toString());
			client.end();
		});
		
		break;
	case 'list':
		var client = net.connect({
			'port': config.tcp_port,
			'host': process.argv[2]
		}, function() {
			client.write(JSON.stringify({
				'action': 'list'
			}));
		});
		
		client.on('data', function(data) {
			console.log(JSON.parse(data.toString()));
			client.end();
		});
		
		break;
	case 'heartbeat':
		var message = new Buffer(JSON.stringify({
			'action': 'heartbeat'
		}));
	
		var client = dgram.createSocket("udp4");
		
		client.bind(config.udp_port);
		client.setBroadcast(true);
		client.send(message, 0, message.length, config.udp_port, process.argv[2], function(error, bytes) {
			setTimeout(function() {
				client.close();
			}, 2500);
		});
		client.on('message', function(buffer, remote) {
			if(!(remote.address in config.ip_list)) {
				data = JSON.parse(buffer.toString());
				console.log(remote.address + ' is ' + data.status);
			}
		});
		break;
}
