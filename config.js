'use strict';

// Require custom module
var assist = require('./library/assist');

// Broadcast 
exports.broadcast = '140.126.130.255';

// TCP port
exports.tcp_port = 6000;

// UDP port
exports.udp_port = 6001;

// Server IP Address
exports.address = null;

// Join / Quit Group Wait Time
exports.wait = 500;

// DFS Target Directory
exports.target = '/rnfs_shared';

// Local Devices IP
exports.ip_list = assist.getIP();

// Datanode ID
exports.hash = assist.hash();

// Database Config
exports.db = {
	'user': 'rnfs',
	'pass': 'rnfs',
	'host': '140.126.130.200',
	'port': 3306,
	'name': 'parliament'
}