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

// Join / Quit Group Wait Time
exports.wait = 500;

// Files Backup Amount
exports.backup = 1;

// Datanode ID
exports.hash = assist.hash();

// DFS Target Directory
exports.target = '/rnfs_shared';

// Database Config
exports.db = {
	'user': 'rnfs',
	'pass': 'rnfs',
	'host': '140.126.130.200',
	'port': 3306,
	'name': 'parliament'
}
