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

console.log('Parliament Start');

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
		if(!global.parliament.is_init && global.parliament.member != {}) {
			global.parliament.is_init = true;
			global.parliament.is_leader = true;
			global.parliament.member[config.address] = {
				'role': 'leader',
				'hash': config.hash
			}
			
			console.log('Set role: Leader');
			console.log(global.parliament.member);
		}
    }, config.wait);
});

/**
 * UDP Client - Quit Group
 * 
 * if process catch SIGINT or Process Exit Event then Send Quit Commmd 
 */
function sendQuit() {
	global.parliament.is_quit = true;
	
	if(global.parliament.is_leader) {
		var leader = '0.0.0.0';
		for(var ip in global.parliament.member) {
			if(global.parliament.member[ip]['role'] != 'leader') {
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
	
	// Close All Server
	tcp_server.stop();
	udp_server.stop();
}

// If process self exit
process.on('exit', function() {
	if(!global.parliament.is_quit)
		// Send Quit Command
		sendQuit();
});

// If User pressed Ctrl-C
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
