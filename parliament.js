#!/usr/bin/env node

'use strict';

// Require module
var net = require('net');
var dgram = require('dgram');
var os = require('os');

// Require custom module
var config = require('./config');

// Parliament status
var is_coordinator = false;
var is_init = false;

// UDP Server
var udp_server = dgram.createSocket("udp4");

udp_server.on("listening", function () {
  var address = server.address();
  console.log("server listening " + address.address + ":" + address.port);
});

udp_server.on('message', function (message, remote) {
    console.log(remote.address + ':' + remote.port +' - ' + message);
});

udp_server.bind(config.udp_port);

console.log('Parliament Start\n');

// UDP Client
var message = new Buffer(JSON.stringify({
  'action': 'join',
  'hash': config.hash
}));

var client = dgram.createSocket("udp4");

client.bind();
client.setBroadcast(true);
client.send(message, 0, message.length, config.udp_port, '255.255.255.255', function(error, bytes) {
	if(error)
    	throw error;
    	
    console.log('UDP message sent to ' + '255.255.255.255' +':'+ udp_port);
	
    client.close();
});

