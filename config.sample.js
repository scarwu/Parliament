'use strict';

// Require custom module
var assist = require('./library/assist');

// TCP port
exports.tcp_port = 6000;

// UDP port
exports.udp_port = 6001;

// Server IP Address
exports.address = assist.getAddress('eth0');

// Broadcast 
exports.broadcast = assist.getBroadcast('eth0', '255.255.255.0');

// Join / Quit Group Waiting
exports.wait = 500;

// Heartbeat Interval
exports.heartbeat = 60000; // 1 min

// File Backup
exports.backup = 1;

// File Name Length
exports.name_length = 32

// Datanode ID
exports.hash = assist.hash();

// DFS Target Directory
exports.target = './shared_folder';

// Database Config
exports.db = {
	'user': 'rnfs',
	'pass': 'rnfs',
	'host': '127.0.0.1',
	'port': 3306,
	'name': 'parliament'
}
