/**
 * UDP Command Handler
 * 
 * @package		Parliament
 * @author		ScarWu
 * @copyright	Copyright (c) 2012-2013, ScarWu (http://scar.simcz.tw/)
 * @license		https://github.com/scarwu/Parliament/blob/master/LICENSE
 * @link		https://github.com/scarwu/Parliament
 */

'use strict'

// Require module
var net = require('net');
var dgram = require('dgram');
var util = require('util');

// Require custom module
var config = require('../config');
var assist = require('./assist');

// Module Exports

/**
 * Heartbeat
 */
exports.heartbeat = function(data, socket, remote) {
	var status = global._status;

	if(!status.is_init || remote.address == config.address)
		return false;

	util.log('--> UDP: Heartbeat');
	util.log('<-- UDP: Heartbeat - Status: Alive');

	var message = new Buffer(JSON.stringify({
		'status': 'alive',
		'hash': config.hash
	}));
	socket.send(message, 0, message.length, config.udp_port, remote.address);
}

/**
 * Join group
 */
exports.join = function(data, socket, remote) {
	var status = global._status;
	
	// is init and is leader
	if(!status.is_init || !status.is_leader)
		return false;

	util.log('--> UDP: Join');

	status.member[data.hash] = {
		'is_leader': false,
		'hash': data.hash,
		'ip': remote.address
	}
	
	// Send Command: Accept
	var message = new Buffer(JSON.stringify({
		'action': 'accept',
		'hash': config.hash,
		'member': status.member
	}));
	socket.send(message, 0, message.length, config.udp_port, remote.address);
	util.log('<-- UDP: Join - Accept');

	// Send Command: Refresh
	var message = new Buffer(JSON.stringify({
		'action': 'refresh',
		'hash': config.hash,
		'member': status.member
	}));
	socket.setBroadcast(true);
	socket.send(message, 0, message.length, config.udp_port, config.broadcast);
	util.log('<-- UDP: Join - Refresh');

	util.log('=== UDP: Join - IP: ' + remote.address);
	assist.list_member(status.member);
}

/**
 * Accept new member
 */
exports.accept = function(data, socket, remote) {
	var status = global._status;

	if(status.is_init)
		return false;

	status.is_init = true;
	status.member = data.member;

	util.log('--> UDP: Accept');
	util.log('--> UDP: Accept - Member');
	assist.list_member(status.member);

	util.log('<-- UDP: Accept - Unique: Request');

	// Request All Unique
	var client = net.connect({
		'port': config.tcp_port,
		'host': remote.address
	}, function() {
		client.write(JSON.stringify({
			'action': 'all_unique'
		}));
	});

	var json_stream = require('JSONStream').parse();
	client.pipe(json_stream);

	// handle buffer
	json_stream.on('data', function(unique) {
		util.log('=== UDP: Accept - Unique: End');
		for(var id in unique) {
			if(status.all_unique[id] == undefined)
				status.all_unique[id] = {};

			for(var hash in unique[id])
				status.all_unique[id][hash] = 1;
		}

		util.log('<-- UDP: Accept - Unique: Merge');
		// Send sub unique
		for(var hash in status.member)
			if(hash != config.hash)
				send_record_merge({
					'port': config.tcp_port,
					'host': status.member[hash].ip
				});

		client.end();
	});
}

// Send Record
function send_record_merge(option) {
	var client = net.connect(option, function() {
		client.write(JSON.stringify({
			'action': 'record_merge',
			'hash': config.hash
		}));

		client.end();
	});
}

/**
 * Quit group
 */
exports.quit = function(data, socket, remote) {
	var status = global._status;

	if(remote.address == config.address || !status.is_init)
		return false;

	// Delete quit node's record
	for(var id in status.all_unique)
		if(status.all_unique[id][data.hash] != undefined) {
			delete status.all_unique[id][data.hash];

			if(Object.keys(status.all_unique[id]) == 0)
				delete status.all_unique[id];
		}

	// Delete quit node
	delete status.member[data.hash];

	util.log('--> UDP: Quit');

	if(data.leader == config.hash) {
		util.log('--> UDP: Quit - Set role: Leader');

		status.is_leader = true;
		status.member[config.hash].is_leader = true;

		// Send Command: Refresh
		var message = new Buffer(JSON.stringify({
			'action': 'refresh',
			'hash': config.hash,
			'member': status.member
		}));
		socket.setBroadcast(true);
		socket.send(message, 0, message.length, config.udp_port, config.broadcast);
		util.log('<-- UDP: Quit - Refresh');

		// Send Heartbeat
		util.log('=== UDP: Heartbeat - Start');
		status.heartbeat_timer = setInterval(function() {
			util.log('<-- UDP: Heartbeat');

			var message = new Buffer(JSON.stringify({
				'action': 'heartbeat'
			}));

			var client = dgram.createSocket("udp4");
			
			client.bind(config.udp_port);
			client.setBroadcast(true);
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
	}

	util.log('=== UDP: Quit - IP: ' + remote.address);
	assist.list_member(status.member);
}

/**
 * Refresh list
 */
exports.refresh = function(data, socket, remote) {
	var status = global._status;
	
	if(!status.is_init)
		return false;

	status.member = data.member;

	util.log('--> UDP: Refresh');
	assist.list_member(status.member);
}
