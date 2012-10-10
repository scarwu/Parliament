'use strict'

// Require module
var os = require('os');
var fs = require('fs');

// Module Exports
exports.getIP = getIP;
exports.messString = messString;
exports.hash = hash;

// Get local devices IP
function getIP() {
	var ip = new Array();
	var ifaces = os.networkInterfaces();

	for (var dev in ifaces) {
		var alias = 0;
		ifaces[dev].forEach(function(details) {
			if (details.family == 'IPv4' && details.address != '127.0.0.1')
				ip[details.address] = details.internal;
		});
	}

	return ip;
}

// Generate [0-9a-Z] random char
function messString(length) {
	var str = '';
	var char = new Array(
		'1', '2', '3', '4', '5', '6', '7', '8', '9', '0',
		'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
		'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
		'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D',
		'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N',
		'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X',
		'Y', 'Z'
	);
	do {
		str += char[parseInt(Math.random() * 62, 10)];
	} while(str.length < length);

	return str;
}

function hash() {
	var result = null;
	var path = process.argv[1].substring(0, process.argv[1].length - 13) + 'uuid';

	if(fs.existsSync(path))
		result = fs.readFileSync(path, null).toString();
	else {
		result = messString(8);
		fs.writeFileSync(path, result);
	}

	return result;
}