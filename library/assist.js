/**
 * Assist
 * 
 * @package		Parliament
 * @author		ScarWu
 * @copyright	Copyright (c) 2012-2013, ScarWu (http://scar.simcz.tw/)
 * @license		https://github.com/scarwu/Parliament/blob/master/LICENSE
 * @link		https://github.com/scarwu/Parliament
 */

'use strict'

// Require module
var os = require('os');
var fs = require('fs');
var util = require('util');

// Module Exports
exports.messString = messString;
exports.hash = hash;
exports.getAddress = getAddress;
exports.getBroadcast = getBroadcast;
exports.list_member = list_member;

// Get IP Address
function getAddress(device_name) {
	var ip_address = '127.0.0.1';
	var device = os.networkInterfaces()[device_name];

	for(var index in device) {
		if(device[index].family == 'IPv4')
			ip_address = device[index].address;
	};

	return ip_address;
}

// Get Broadcast Address
function getBroadcast(device, netmask) {
	var broadcast = [255, 255, 255, 255];
	var address = getAddress(device).split('.');
	netmask = netmask.split('.');

	for(var index in broadcast)
		broadcast[index] = (broadcast[index] ^ netmask[index]) | address[index];

	return broadcast.join('.');
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

// Get hash
function hash() {
	var result = null;
	var path = process.argv[1].split('/');
	path.pop();
	path = '/' + path.join('/') + '/tmp/hash';

	if(fs.existsSync(path))
		result = fs.readFileSync(path, null).toString().replace('\n', '');
	else {
		result = messString(8);
		fs.writeFileSync(path, result);
	}

	return result;
}

function list_member(member) {
	for(var index in member) {
		var output = member[index].is_leader ? 'Leader: ' : 'Member: ';
		util.log('=== SYS: ' + output + member[index].hash + ' (' + member[index].ip + ')');
	}
}