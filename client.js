#!/usr/bin/env node

var net = require('net');

var client = net.connect({
	'port': 6000,
	'host': '140.126.130.226'
}, function() {
	console.log('Connected ------------------------------------');
	client.write(JSON.stringify({
		'action': 'list'
	}));
});

client.on('data', function(data) {
	console.log(JSON.parse(data.toString()));
	client.end();
});

client.on('end', function() {
	console.log('Disconnected ---------------------------------');
});
