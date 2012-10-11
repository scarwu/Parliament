#!/usr/bin/env node

'use strict';

// Require module
var os = require('os');
var net = require('net');
var dgram = require('dgram');

// Require custom module
var config = require('./config');
var tcp_server = require('./library/tcp_server');
var udp_server = require('./library/udp_server');

// Parliament status
global.parliament = {
	is_leader: false,
	is_init: false,
	is_quit: false,
	member: {}
}

console.log('Parliament Start\n');
console.log('Information --------------------');
console.log('IP Address - ' + config.address);
console.log('Broadcast  - ' + config.broadcast);
console.log('TCP Port   - ' + config.tcp_port);
console.log('UDP Port   - ' + config.udp_port);
console.log('Node Hash  - ' + config.hash);
console.log('--------------------------------\n');

/**
 * TCP Server Handler
 * 
 * Listening port 6000
 */
tcp_server.start();

/**
 * UDP Server Handler
 * 
 * Listening port 6001
 */
udp_server.start();

/**
 * UDP Client - Join Group
 */
var message = new Buffer(JSON.stringify({
	'action': 'join',
	'hash': config.hash
}));

var client = dgram.createSocket("udp4");

client.bind(config.udp_port);
client.setBroadcast(true);
client.send(message, 0, message.length, config.udp_port, config.broadcast, function(error, bytes) {
    console.log('Send Command: Join');
    client.close();
    
    console.log('Wait response: ' + config.wait + ' ms');
    setTimeout(function() {
    	var status = global.parliament;

		if(!status.is_init && status.member != {}) {
			status.is_init = true;
			status.is_leader = true;
			status.member[config.hash] = {
				'role': 'leader',
				'hash': config.hash,
				'ip': config.address
			}
			
			console.log('Set role: Leader');
			console.log(status.member);
		}
    }, config.wait);
});

/**
 * UDP Client - Quit Group
 * 
 * if process catch SIGINT or Process Exit Event then Send Quit Commmd 
 */
function sendQuit() {
	var status = global.parliament;

	status.is_quit = true;
	
	if(status.is_leader) {
		var leader = null;
		for(var hash in status.member) {
			if(status.member[hash]['role'] != 'leader') {
				leader = status.member[hash]['hash'];
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
	
	client.bind(config.udp_port);
	client.setBroadcast(true);
	client.send(message, 0, message.length, config.udp_port, config.broadcast, function(error, bytes) {
		if(error)
	    	throw error;
	    	
	    console.log('Send Command: Quit');
	    client.close();
	});
	
	// Close All Server
	tcp_server.stop();
	udp_server.stop();
}

// Catch process exit
process.on('exit', function() {
	if(!global.parliament.is_quit)
		// Send Quit Command
		sendQuit();
});

// Catch process uncaught Exception
// process.on('uncaughtException', function() {
// 	if(!global.parliament.is_quit) {
// 		// Send Quit Command	
// 		sendQuit();
	  	
// 	  	// Wait N Second
// 	  	setTimeout(function() {
// 			process.exit(0);
// 		}, config.wait);
// 	}
// });

// Catch Ctrl-C
process.on('SIGINT', function() {
	if(!global.parliament.is_quit) {
		// Send Quit Command	
		sendQuit();
	  	
	  	// Wait N Second
	  	setTimeout(function() {
			process.exit(0);
		}, config.wait);
	}
});
