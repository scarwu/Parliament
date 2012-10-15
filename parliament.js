#!/usr/bin/env node

'use strict';

// Require module
var os = require('os');
var fs = require('fs');
var net = require('net');
var dgram = require('dgram');

// Require custom module
var config = require('./config');
var assist = require('./library/assist');
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
console.log('IP Address - ' + config.address);
console.log('Broadcast  - ' + config.broadcast);
console.log('TCP Port   - ' + config.tcp_port);
console.log('UDP Port   - ' + config.udp_port);
console.log('Node Hash  - ' + config.hash);
console.log('');

// Make directory
if(!fs.existsSync(config.target))
	fs.mkdirSync(config.target);

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
    assist.log('<-- UDP - Join');
    client.close();
    
    assist.log('<-- UDP - Join - Wait response: ' + config.wait + ' ms');
    setTimeout(function() {
    	var status = global.parliament;

		if(!status.is_init && status.member != {}) {
			status.is_init = true;
			status.is_leader = true;
			status.member[config.hash] = {
				'is_leader': true,
				'hash': config.hash,
				'ip': config.address
			}
			
			assist.log('<-- UDP - Join - Set role: Leader');
			assist.list_member(status.member);
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
	
	client.bind(config.udp_port);
	client.setBroadcast(true);
	client.send(message, 0, message.length, config.udp_port, config.broadcast, function(error, bytes) {
		if(error)
	    	throw error;
	    	
	    assist.log('<-- UDP - Quit');
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
// process.on('uncaughtException', function(except) {
// 	assist.log(except);

// 	if(!global.parliament.is_quit) {
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
	if(!global.parliament.is_quit) {
		// Send Quit Command	
		sendQuit();
	  	
	  	// Wait N Second
	  	setTimeout(function() {
			process.exit(0);
		}, config.wait);
	}
});
