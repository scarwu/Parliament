'use strict'

// Require module
var fs = require('fs');
var net = require('net');
var util = require('util');

var mysql = require('mysql-libmysqlclient');

// Require custom module
var config = require('../config');
var assist = require('./assist');

// File system extend
fs.copy = function(source, destination, callback) {
	function copy() {
		util.pump(fs.createReadStream(source), fs.createWriteStream(destination), callback);
	}

	if(fs.existsSync(source) && !fs.existsSync(destination))
		copy();
};

/**
 * List Member
 */
exports.list = function(data, socket) {
	var status = global.parliament;

	assist.log('--> TCP: List');
	socket.write(JSON.stringify(status.member));
	socket.end();
}

/**
 * Find Unique ID is exists
 */
exports.exists = function(data, socket) {
	var status = global.parliament;

	assist.log('--> TCP: Exists - Unique ID: ' + data.unique_id);

	var conn = mysql.createConnectionSync();
	conn.connectSync(config.db.host, config.db.user, config.db.pass, config.db.name, config.db.port);

	var sql = util.format('SELECT * FROM relation WHERE unique_id="%s"', data.unique_id);
	var result = conn.querySync(sql).fetchAllSync();

	conn.closeSync();

	assist.log('--> TCP: Exists: ' + (result.length != 0));
	socket.write(JSON.stringify({
		'exists': result.length != 0
	}));
	socket.end();
}

/**
 * Read File or Redirect
 */
exports.read = function(data, socket) {
	var status = global.parliament;
	var path = config.target + '/' +  data.unique_id.replace('/', '');

	assist.log('--> TCP: Read');

	if(fs.existsSync(path)) {
		assist.log('<-- TCP: Read - File: ' + data.unique_id);

		// File Stream to Net Stream
		var read_stream = fs.createReadStream(path);
		read_stream.pipe(socket);

		socket.on('end', function() {
			assist.log('=== TCP: Read - File Size: ' + fs.statSync(path).size + ' bytes');
		});
	}
	else {
		assist.log('<-- TCP: Read - Read - File: ' + data.unique_id);

		var conn = mysql.createConnectionSync();
		conn.connectSync(config.db.host, config.db.user, config.db.pass, config.db.name, config.db.port);

		var sql = util.format('SELECT * FROM relation WHERE unique_id="%s"', data.unique_id);
		var result = conn.querySync(sql).fetchAllSync()[0];

		conn.closeSync();

		// Compare DB table and Member List
		var entity_list = new Array();
		var regex = /^entity_(\w+)/;
		for(var index in result) {
			if(index.match(regex) && result[index] != 0 && regex.exec(index)[1] in status.member)
				entity_list.push(regex.exec(index)[1]);
		}

		assist.log('=== TCP: Read - Read - Node: ' + JSON.stringify(entity_list));

		// FIXME
		var client = net.connect({
			'port': config.tcp_port,
			// Random Select Entity (Fixme)
			'host': status.member[entity_list[parseInt(Math.random() * entity_list.length)]].ip
		}, function() {
			client.write(JSON.stringify({
				'action': 'read',
				'unique_id': data.unique_id
			}));
		});

		// Net Stream to Net Stream
		client.pipe(socket);

		socket.on('end', function() {
			assist.log('=== TCP: Read - Redirect');
		});
	}
}

/**
 * Create File
 */
exports.create = function(data, socket) {
	socket.end();

	var status = global.parliament;
	var path = config.target + '/' +  data.unique_id.replace('/', '');

	assist.log('--> TCP: Create - File: ' + data.unique_id);

	if(fs.existsSync(path)) {
		socket.end();
		return false;
	}

	fs.copy(data.source, path, function(error) {
		if(error) {
			socket.end();
			return false;
		}

		assist.log('=== TCP: Create - File Size: ' + fs.statSync(path).size + ' bytes');
		assist.log('=== TCP: Create - Database write-back: ' + data.unique_id);

		var conn = mysql.createConnectionSync();
		conn.connectSync(config.db.host, config.db.user, config.db.pass, config.db.name, config.db.port);

		var sql = util.format('INSERT INTO relation (unique_id, entity_%s) VALUES ("%s", 1)', config.hash, data.unique_id);
		conn.querySync(sql);
		conn.closeSync();
		
		// Call anothor server backup file
		var count = 0;
		for(var index in status.member)
			if(status.member[index].hash != config.hash) {
				assist.log('<-- TCP: Backup - IP: ' + status.member[index].ip);

				//FIXME
				send_backup({
					'port': config.tcp_port,
					'host': status.member[index].ip
				}, data.unique_id);

				if(++count >= config.backup)
					break;
			}
	});
}

/**
 * Backup File from Remote Server
 */
exports.backup = function(data, socket) {
	socket.end();

	var status = global.parliament;
	var path = config.target + '/' +  data.unique_id.replace('/', '');

	assist.log('--> TCP: Backup - File: ' + data.unique_id);

	// Send Command: Read
	var client = net.connect({
		'port': config.tcp_port,
		'host': socket.remoteAddress
	}, function() {
		client.write(JSON.stringify({
			'action': 'read',
			'unique_id': data.unique_id
		}));
		assist.log('<-- TCP: Backup - Read - File: ' + data.unique_id);
	});
	
	// Net Stream to File Stream
	var write_stream = fs.createWriteStream(path);
	client.pipe(write_stream);

	client.on('end', function() {
		if(fs.existsSync(path)) {
			assist.log('=== TCP: Backup - Read - File Size: ' + fs.statSync(path).size + ' bytes');
			assist.log('=== TCP: Backup - Database write-back: ' + data.unique_id);

			var conn = mysql.createConnectionSync();
			conn.connectSync(config.db.host, config.db.user, config.db.pass, config.db.name, config.db.port);

			var sql = util.format('UPDATE relation SET entity_%s=1 WHERE unique_id="%s"', config.hash, data.unique_id);
			conn.querySync(sql);
			conn.closeSync();
		}
	});
}

/**
 * Delete File
 */
exports.delete = function(data, socket) {
	socket.end();

	var status = global.parliament;
	var path = config.target + '/' +  data.unique_id.replace('/', '');

	if(fs.existsSync(path))
		fs.unlink(path, function(error) {
			if(error) {
				socket.end();
				return false;
			}

			assist.log('--> TCP: Delete - File: ' + data.unique_id);

			var conn = mysql.createConnectionSync();
			conn.connectSync(config.db.host, config.db.user, config.db.pass, config.db.name, config.db.port);

			// Update Database
			var sql = util.format('UPDATE relation SET entity_%s=0 WHERE unique_id="%s"', config.hash, data.unique_id);
			conn.querySync(sql);

			// Compare DB table and Member List
			var sql = util.format('SELECT * FROM relation WHERE unique_id="%s"', data.unique_id);
			var result = conn.querySync(sql).fetchAllSync()[0];

			var count = 0;
			var regex = /^entity_(\w+)/;
			for(var index in result) {
				if(index.match(regex) && regex.exec(index)[1] in status.member)
					count += result[index];
			}

			if(count == 0) {
				var sql = util.format('DELETE FROM relation WHERE unique_id="%s"', data.unique_id);
				conn.querySync(sql);
			}

			conn.closeSync();
		});
}

function send_backup(option, unique_id) {
	var client = net.connect(option, function() {
		client.write(JSON.stringify({
			'action': 'backup',
			'unique_id': unique_id
		}));

		client.end();
	});
}

function send_delete(option, unique_id) {
	var client = net.connect(option, function() {
		client.write(JSON.stringify({
			'action': 'delete',
			'unique_id': unique_id
		}));

		client.end();
	});
}