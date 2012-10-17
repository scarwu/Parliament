#!/usr/bin/env node

var net = require('net');
var dgram = require('dgram');
var config = require('./config');
var assist = require('./library/assist');

// Check argv
if(process.argv.length <= 3)
	process.exit();

switch(process.argv[3]) {
	// Send Heartbeat
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
			data = JSON.parse(buffer.toString());
			if(data.status != undefined)
				console.log(remote.address + ' is ' + data.status);
		});

		break;

	// Send list
	case 'list':
		var timer = null;
		var client = net.connect({
			'port': config.tcp_port,
			'host': process.argv[2]
		}, function() {
			client.write(JSON.stringify({
				'action': 'list'
			}));

			timer = setTimeout(function() {
				client.end();
			}, 1000);
		});
		
		client.on('data', function(data) {
			assist.list_member(JSON.parse(data.toString()));
			client.end();
			clearTimeout(timer);
		});
		
		break;

	// Send read
	case 'read':
		if(process.argv.length <= 4)
			process.exit();

		var timer = null;
		var client = net.connect({
			'port': config.tcp_port,
			'host': process.argv[2]
		}, function() {
			client.write(JSON.stringify({
				'action': 'read',
				'path': process.argv[4]
			}));

			timer = setTimeout(function() {
				client.end();
			}, 1000);
		});

		client.on('data', function(data) {
			console.log(data.toString());
			clearTimeout(timer);
		});
		break;

	// Send read
	case 'test':
		if(process.argv.length <= 4)
			process.exit();

		var timer = null;
		var client = net.connect({
			'port': config.tcp_port,
			'host': process.argv[2]
		}, function() {
			client.write(JSON.stringify({
				'action': 'read',
				'path': process.argv[4]
			}));

			timer = setTimeout(function() {
				client.end();
			}, 1000);
		});
		
		var size_count = 0;
		var callback_count = 0;
		client.on('data', function(data) {
			size_count += data.length;
			callback_count++;
			clearTimeout(timer);
		});
		
		client.on('end', function() {
			console.log('Callback: ' + callback_count + ' times');
			console.log('Filesize: ' + size_count + ' bytes');
		});

		break;
		
	// Sned Create
	case 'create':
		if(process.argv.length <= 5)
			process.exit();

		var timer = null;
		var client = net.connect({
			'port': config.tcp_port,
			'host': process.argv[2]
		}, function() {
			client.write(JSON.stringify({
				'action': 'create',
				'path': process.argv[4],
				'src': process.argv[5]
			}));
			
			client.end();
		});

		break;

	// Send Backup
	case 'backup':
		if(process.argv.length <= 4)
			process.exit();

		var timer = null;
		var client = net.connect({
			'port': config.tcp_port,
			'host': process.argv[2]
		}, function() {
			client.write(JSON.stringify({
				'action': 'backup',
				'path': process.argv[4]
			}));

			client.end();
		});

		break;

	// Send Delete
	case 'delete':
		if(process.argv.length <= 4)
			process.exit();

		var client = net.connect({
			'port': config.tcp_port,
			'host': process.argv[2]
		}, function() {
			client.write(JSON.stringify({
				'action': 'delete',
				'path': process.argv[4]
			}));

			client.end();
		});

		break;

	default:
		console.log('No command');
}
