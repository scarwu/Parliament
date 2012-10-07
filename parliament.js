#!/usr/bin/env node

'use strict';

// Require module
var os = require('os');
var net = require('net');
var dgram = require('dgram');

// Require custom module
var config = require('./config');

// Parliament status
var is_leader = false;
var is_init = false;
var is_quit = false;
var member = {}

console.log('Parliament Start');

/**
 * TCP Server Handler
 * 
 * Listening port 6000
 */
var tcp_server = net.createServer(function(socket) {
	socket.on('data', function(message) {
		console.log('Log ' + sock.remoteAddress + ': ' + message);
		
		var data = JSON.parse(message);
		
		switch(data.action) {
			case 'list':
				sock.write(JSON.stringify(member));
				sock.pipe(sock);
				break;
		}
	    
	});
	
}).listen(config.tcp_port);

/**
 * UDP Server Handler
 * 
 * Listening port 6001
 */
var udp_server = dgram.createSocket("udp4");

udp_server.on('message', function(message, remote) {
	var data = JSON.parse(message);

	switch(data.action) {
		case 'join':
				if(is_init && is_leader) {
					member[remote.address] = {
						'role': 'member',
						'hash': data.hash
					}
					console.log(member);
					
					// Accept
					var message = new Buffer(JSON.stringify({
						'action': 'accept',
						'member': member
					}));
					udp_server.send(message, 0, message.length, config.udp_port, remote.address);
					console.log('Send Command: Accept');
					
					// Refresh
					var message = new Buffer(JSON.stringify({
						'action': 'refresh',
						'member': member
					}));
					udp_server.setBroadcast(true);
					udp_server.send(message, 0, message.length, config.udp_port, config.broadcast);
					console.log('Send Command: Refresh');
				}
				
				if(!is_init && remote.address in config.ip_list && data.hash == config.hash)
					config.address = remote.address;
			break;
		case 'accept':
			if(!is_init) {
				is_init = true;
				member = data.member;
				console.log('Set role: Member');
				console.log(member);
			}
			break;
		case 'quit':
			if(remote.address != config.address) {
				delete member[remote.address];
				
				if(data.leader == config.address) {
					is_leader = true;
					member[config.address]['role'] = 'leader';
					var message = new Buffer(JSON.stringify({
						'action': 'refresh',
						'member': member
					}));
					udp_server.setBroadcast(true);
					udp_server.send(message, 0, message.length, config.udp_port, config.broadcast);
					console.log('Send Command: Refresh');
				}
				
				console.log(remote.address + ' was Quit');
			}
			break;
		case 'refresh':
			if(is_init) {
				member = data.member;
				console.log('Refresh Member List');
				console.log(member);
			}
			break;
		default:
			console.log('Undefined command.');
	}
});

udp_server.bind(config.udp_port, config.network);

/**
 * UDP Client
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
    
    setTimeout(function() {		
		if(!is_init && member != {}) {
			is_init = true;
			is_leader = true;
			member[config.address] = {
				'role': 'leader',
				'hash': config.hash
			}
			
			console.log('Set role: Leader');
			console.log(member);
		}
    }, config.wait);
});

/**
 * Parliament Quit
 * 
 * if process catch SIGINT or Process Exit Event then Send Quit Commmd 
 */
function sendQuit() {
	is_quit = true;
	
	if(is_leader) {
		var leader = '0.0.0.0';
		for(var ip in member) {
			if(member[ip]['role'] != 'leader') {
				leader = ip;
				break;
			}
		}
		var message = new Buffer(JSON.stringify({
		  'action': 'quit',
		  'leader': leader
		}));
	}
	else
		var message = new Buffer(JSON.stringify({
		  'action': 'quit'
		}));
	
	var client = dgram.createSocket("udp4");
	
	client.bind(config.udp_port);
	client.setBroadcast(true);
	client.send(message, 0, message.length, config.udp_port, config.broadcast, function(error, bytes) {
		if(error)
	    	throw error;
	    	
	    console.log('Send Command: Quit');
	    client.close();
	});
	
	// Close All Server Listening
	tcp_server.close();
	udp_server.close();
}

process.on('exit', function() {
	if(!is_quit)
		// Send Quit Command
		sendQuit();
});

process.on('SIGINT', function() {
	if(!is_quit) {
		// Send Quit Command	
		sendQuit();
	  	
	  	// Wait N Second
	  	setTimeout(function() {
			process.exit(0);
		}, config.wait);
	}
});
