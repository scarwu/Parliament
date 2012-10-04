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
var member = {}

console.log('Parliament Start');

/**
 * TCP Server Handler
 */
var tcp_server = net.createServer(function(sock) {
	sock.on('data', function(message) {
		console.log('Log ' + sock.remoteAddress + ': ' + message);
		
		var data = JSON.parse(message);
		
		switch(data.action) {
			case 'list':
				sock.write(JSON.stringify(member));
				sock.pipe(sock);
				break;
		}
	    
	});
});



tcp_server.listen(config.tcp_port);

/**
 * UDP Server Handler
 */
var udp_server = dgram.createSocket("udp4");

udp_server.on('message', function (message, remote) {
	var data = JSON.parse(message);
	
	console.log('Log: ' + remote.address + ':' + remote.port + ' - ' + data.action);
	
	switch(data.action) {
		case 'join':
			if(is_init && is_leader) {
				member[remote.address] = {
					'role': 'member',
					'hash': data.hash
				}
				console.log('\nMember Join ----------------------------------------------------');
				console.log(member);
				console.log('-----------------------------------------------------------------\n');
				var message = new Buffer(JSON.stringify({
					'action': 'accept',
					'member': member
				}));
				udp_server.send(message, 0, message.length, config.udp_port, remote.address, function(error, bytes) {
					if(error)
				    	throw error;
				    	
				    console.log('Send Command: Accept');
				});
			}
			
			if(!is_init && remote.address in config.ip_list && data.hash == config.hash)
				config.address = remote.address;
			
			break;
		case 'accept':
			if(!is_init) {
				is_init = true;
				
				console.log('Set role: Member');
				
				member = data.member;
				console.log('\nMember Accepted ------------------------------------------------');
				console.log(member);
				console.log('-----------------------------------------------------------------\n');
			}
			break;
		case 'quit':
			
			break;
		case 'refresh':
			member = data.member;
			console.log('\nMember Refresh -------------------------------------------------');
			console.log(member);
			console.log('-----------------------------------------------------------------\n');
			break;
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
	if(error)
    	throw error;
    	
    console.log('Send Command: Join');
    client.close();
    
    setTimeout(function() {		
		if(!is_init && member != {}) {
			is_init = true;
			is_leader = true;
			member[config.address] = {
				'role': 'Leader',
				'hash': config.hash
			}
			
			console.log('Set role: Leader');
		}
    }, config.wait);
});
