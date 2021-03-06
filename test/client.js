#!/usr/bin/env node
/**
 * Parliament Test Client
 * 
 * @package		Parliament
 * @author		ScarWu
 * @copyright	Copyright (c) 2012-2013, ScarWu (http://scar.simcz.tw/)
 * @license		https://github.com/scarwu/Parliament/blob/master/LICENSE
 * @link		https://github.com/scarwu/Parliament
 */

'use strict'

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

	// Send unique
	case 'all_unique':
		var timer = null;
		var client = net.connect({
			'port': config.tcp_port,
			'host': process.argv[2]
		}, function() {
			client.write(JSON.stringify({
				'action': 'all_unique'
			}));

			timer = setTimeout(function() {
				client.end();
			}, 1000);
		});
		
		var parse_stream = require('JSONStream').parse();
		client.pipe(parse_stream);

		parse_stream.on('data', function(object) {
			client.end();
			console.log(object);
		});
		
		break;

	// Send unique
	case 'sub_unique':
		var timer = null;
		var client = net.connect({
			'port': config.tcp_port,
			'host': process.argv[2]
		}, function() {
			client.write(JSON.stringify({
				'action': 'sub_unique'
			}));

			timer = setTimeout(function() {
				client.end();
			}, 1000);
		});
		
		var parse_stream = require('JSONStream').parse();
		client.pipe(parse_stream);

		parse_stream.on('data', function(object) {
			client.end();
			console.log(object);
		});
		
		break;

	// Send read
	case 'exists':
		if(process.argv.length <= 4)
			process.exit();

		var timer = null;
		var client = net.connect({
			'port': config.tcp_port,
			'host': process.argv[2]
		}, function() {
			client.write(JSON.stringify({
				'action': 'exists',
				'unique_id': process.argv[4]
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
				'unique_id': process.argv[4]
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
				'unique_id': process.argv[4]
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
				'unique_id': process.argv[4],
				'source': process.argv[5]
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
				'unique_id': process.argv[4]
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
				'unique_id': process.argv[4]
			}));

			client.end();
		});

		break;

	default:
		console.log('No command');
}
