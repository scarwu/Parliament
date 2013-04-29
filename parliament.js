#!/usr/bin/env node

'use strict';

// Require module
var os = require('os');
var fs = require('fs');
var net = require('net');
var dgram = require('dgram');
var util = require('util');

// Require custom module
var config = require('./config');
var assist = require('./library/assist');
var tcp_server = require('./library/tcp_server');
var udp_server = require('./library/udp_server');

// Parliament status
global._status = {
	is_leader: false,
	is_init: false,
	is_quit: false,
	heartbeat_timer: null,
	member: {},
	sub_unique: {},
	all_unique: {}
}

console.log('Parliament Start\n');
console.log('IP Address - ' + config.address);
console.log('Broadcast  - ' + config.broadcast);
console.log('TCP Port   - ' + config.tcp_port);
console.log('UDP Port   - ' + config.udp_port);
console.log('Node Hash  - ' + config.hash + '\n');

// Make directory
if(!fs.existsSync(config.target))
	fs.mkdirSync(config.target);

// Initialize Unique ID
util.log('=== SYS: Generate Unique ID Indexes');
var list = fs.readdirSync(config.target);
for(var index in list) {
	// Sub Unique Indexes
	global._status.sub_unique[list[index]] = 1;

	// All Unique Indexes
	global._status.all_unique[list[index]] = {};
	global._status.all_unique[list[index]][config.hash] = 1;
}

// TCP Server Handler
util.log('=== SYS: Start TCP Server');
tcp_server.start();

// UDP Server Handler
util.log('=== SYS: Start UDP Server');
udp_server.start();

/**
 * UDP Client - Join Group
 */
var message = new Buffer(JSON.stringify({
	'action': 'join',
	'hash': config.hash,
}));

var client = dgram.createSocket("udp4");

// Send Join Command (BC)
client.bind(config.udp_port, function () {
	client.setBroadcast(true);	
});
client.send(message, 0, message.length, config.udp_port, config.broadcast, function(error, bytes) {
    util.log('<-- UDP: Join');
    client.close();
    
    util.log('<-- UDP: Join - Wait: ' + config.wait + ' ms');

    setTimeout(function() {
    	var status = global._status;

		if(status.is_init || Object.keys(status.member) != 0)
			return false;
		
		status.is_init = true;
		status.is_leader = true;
		status.member[config.hash] = {
			'is_leader': true,
			'hash': config.hash,
			'ip': config.address
		}

		util.log('<-- UDP: Join - Leader');
		assist.list_member(status.member);

		// Send Heartbeat
		util.log('=== UDP: Heartbeat - Start');
		status.heartbeat_timer = setInterval(function() {
			util.log('<-- UDP: Heartbeat');

			var message = new Buffer(JSON.stringify({
				'action': 'heartbeat'
			}));

			var client = dgram.createSocket("udp4");
			
			client.bind(config.udp_port, function () {
				client.setBroadcast(true);
			});
			
			client.send(message, 0, message.length, config.udp_port, config.broadcast, function(error, bytes) {
				setTimeout(function() {
					client.close();
				}, config.wait);
			});

			client.on('message', function(buffer, remote) {
				var data = JSON.parse(buffer.toString());
				if(data.status != undefined)
					util.log('--> UDP: Heartbeat - Msg: ' + remote.address + ' ' + data.status);
			});

		}, config.heartbeat);

	}, config.wait);
});

/**
 * UDP Client - Quit Group
 * 
 * if process catch SIGINT or Process Exit Event then Send Quit Commmd 
 */
function sendQuit() {
	var status = global._status;

	status.is_quit = true;
	
	if(status.is_leader) {
		var leader = null;
		for(var index in status.member) {
			if(!status.member[index].is_leader) {
				leader = status.member[index].hash;
				break;
			}
		}
		var message = new Buffer(JSON.stringify({
			'action': 'quit',
			'leader': leader,
			'hash': config.hash
		}));
	}
	else
		var message = new Buffer(JSON.stringify({
			'action': 'quit',
			'hash': config.hash
		}));

	// Send Command: Quit
	var client = dgram.createSocket("udp4");
	
	client.bind(config.udp_port, function () {
		client.setBroadcast(true);
	});
	
	client.send(message, 0, message.length, config.udp_port, config.broadcast, function(error, bytes) {
		if(error)
	    	throw error;
	    	
	    util.log('<-- UDP: Quit');
	    client.close();
	});
	
	clearInterval(status.heartbeat);

	// Close All Server
	tcp_server.stop();
	udp_server.stop();
}

// Catch process exit
process.on('exit', function() {
	if(!global._status.is_quit)
		// Send Quit Command
		sendQuit();
});

// Catch process uncaught Exception
// process.on('uncaughtException', function(except) {
// 	util.log(except);

// 	if(!global._status.is_quit) {
// 		// Send Quit Command
// 		sendQuit();
	  	
// 	  	// Wait N Second
// 	  	setTimeout(function() {
// 			process.exit(1);
// 		}, config.wait);
// 	}
// });

// Catch Ctrl-C
process.on('SIGINT', function() {
	if(!global._status.is_quit) {
		console.log();

		// Send Quit Command	
		sendQuit();
	  	
	  	// Wait N Second
	  	setTimeout(function() {
			process.exit(0);
		}, config.wait);
	}
});
