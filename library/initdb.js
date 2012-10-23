'use strict'

// Require module
var mysql = require('mysql-libmysqlclient');

// Require custom module
var config = require('../config');

// Module Exports
exports.start = start;

function start() {
	var status = global.parliament;

	// Alter Database Table
	var conn = mysql.createConnectionSync();
	conn.connectSync(config.db.host, config.db.user, config.db.pass, config.db.name, config.db.port);

	var sql = 'ALTER TABLE relation ADD entity_' + config.hash + ' TINYINT(1) NOT NULL DEFAULT 0';
	conn.querySync(sql);
	
	var sql = 'SELECT * FROM relation WHERE entity_' + config.hash + '=1';
	var result = conn.querySync(sql).fetchAllSync();

	if(result.length > 0) {
		
	}

	conn.closeSync();
}