'use strict'

// Require module
var fs = require('fs');
var net = require('net');
var util = require('util');
var dgram = require('dgram');

var mysql = require('mysql-libmysqlclient');

// Require custom module
var config = require('../config');
var assist = require('./assist');

// Module Exports
exports.start = start;
exports.stop = stop;

// File system extend
fs.copy = function(src, dst, callback) {
	function copy(error) {
		var input_stream;
		var output_stream;

		if(!error) {
			return callback(new Error("File " + dst + " exists."));
		}

		fs.stat(src, function (error) {
			if(error)
				return callback(error);

			input_stream = fs.createReadStream(src);
			output_stream = fs.createWriteStream(dst);
			util.pump(input_stream, output_stream, callback);
		});
	}

	fs.stat(dst, copy);
};

var tcp_server = net.createServer(function(socket) {
	
	// Receive Data and Handle
	socket.on('data', function(message) {
		var status = global.parliament;
		var data = JSON.parse(message);

		if(!status.is_init)
			return false;
		
		switch(data.action) {
			// List server status
			case 'list':
				assist.log('--> TCP - List');
				socket.write(JSON.stringify(status.member));
				break;

			// Delete file
			case 'delete':
				socket.end();

				var path = config.target + data.path;

				if(fs.existsSync(path))
					fs.unlink(path, function(error) {
						if(error) {
							socket.end();
							return false;
						}

						assist.log('--> TCP - Delete - File: ' + data.path);

						var conn = mysql.createConnectionSync();
						conn.connectSync(config.db.host, config.db.user, config.db.pass, config.db.name, config.db.port);

						var sql = 'SELECT entity FROM relation WHERE path="' + data.path + '"';
						var entity = conn.querySync(sql).fetchAllSync()[0]['entity'].split('|');

						for(var index in entity)
							if(entity[index] == config.hash) {
								delete entity[index];
								entity.sort();
								entity.pop();
							}

						if(entity.length == 0)
							var sql = 'DELETE FORM relation WHERE path="' + data.path + '"';
						else
							var sql = 'UPDATE relation SET entity="' + entity.join('|') + '" WHERE path="' + data.path + '"';

						assist.log(sql);

						conn.querySync(sql);
						conn.closeSync();
					});
				break;

			// Backup file
			case 'backup':
				socket.end();

				var path = config.target + data.path;

				assist.log('--> TCP - Backup - File: ' + data.path);

				// Send Command: Read
				var client = net.connect({
					'port': config.tcp_port,
					'host': socket.remoteAddress
				}, function() {
					client.write(JSON.stringify({
						'action': 'read',
						'path': data.path
					}));
					assist.log('<-- TCP - Backup - Read - File: ' + data.path);
				});
				
				var size_count = 0;
				client.on('data', function(file) {
					size_count += file.length;

					if(!fs.existsSync(path))
						fs.writeFile(path, file, function(error) {
							if(error) {
								socket.end();
								fs.unlinkSync(path);
								return false;
							}
						});
					else
						fs.appendFile(path, file, function(error) {
							if(error) {
								socket.end();
								fs.unlinkSync(path);
								return false;
							}
						});
				});

				client.on('end', function() {
					if(fs.existsSync(path)) {
						assist.log('=== TCP - Backup - Read - File Size: ' + size_count + ' bytes');
						assist.log('=== TCP - Backup - Database write-back: ' + data.path);

						var conn = mysql.createConnectionSync();
						conn.connectSync(config.db.host, config.db.user, config.db.pass, config.db.name, config.db.port);

						var sql = 'SELECT entity FROM relation WHERE path="' + data.path + '"';
						var entity = conn.querySync(sql).fetchAllSync()[0]['entity'].split('|');
						var is_exists = false;

						for(var hash in entity)
							if(hash == config.hash)
								is_exists = true;

						if(!is_exists)
							entity.push(config.hash);

						var sql = 'UPDATE relation SET entity="' + entity.join('|') + '" WHERE path="' + data.path + '"';
						conn.querySync(sql);
						conn.closeSync();
					}
				});

				break;

			// Create file
			case 'create':
				socket.end();

				var path = config.target + data.path;

				assist.log('--> TCP - Create - File: ' + data.path);

				if(fs.existsSync(path)) {
					socket.end();
					return false;
				}

				fs.copy(data.src, path, function(error) {
					if(error) {
						socket.end();
						return false;
					}

					assist.log('=== TCP - Create - Database write-back: ' + data.path);

					var conn = mysql.createConnectionSync();
					conn.connectSync(config.db.host, config.db.user, config.db.pass, config.db.name, config.db.port);

					var sql = 'INSERT INTO relation (path, entity) VALUES ("' + data.path + '", "' + config.hash + '");';
					conn.querySync(sql);
					conn.closeSync();
					
					// Call anothor server backup file
					var count = 0;
					for(var index in status.member)
						if(status.member[index].hash != config.hash) {
							assist.log('<-- TCP - Backup - IP: ' + status.member[index].ip);

							//FIXME
							sendBackup({
								'port': config.tcp_port,
								'host': status.member[index].ip
							}, data.path);

							if(++count >= config.backup)
								break;
						}
				});
				
				break;

			// Read file
			case 'read':
				var path = config.target + data.path;

				assist.log('--> TCP - Read');

				var size_count = 0;
				if(fs.existsSync(path)) {
					assist.log('<-- TCP - Read - File: ' + data.path);

					fs.readFile(path, null, function(error, file) {
						if(error) {
							socket.end();
							return false;
						}

						size_count += file.length;

						socket.write(file);
						socket.end();
					});
				}
				else {
					assist.log('<-- TCP - Read - Read - File: ' + data.path);

					var conn = mysql.createConnectionSync();
					conn.connectSync(config.db.host, config.db.user, config.db.pass, config.db.name, config.db.port);

					var sql = 'SELECT entity FROM relation WHERE path="' + data.path + '"';
					var entity = conn.querySync(sql).fetchAllSync()[0]['entity'].split('|');

					conn.closeSync();

					var client = net.connect({
						'port': config.tcp_port,
						'host': status.member[entity[0]].ip
					}, function() {
						client.write(JSON.stringify({
							'action': 'read',
							'path': data.path
						}));
					});

					client.on('data', function(file) {
						size_count += file.length;
						socket.write(file);
					});

					client.on('end', function() {
						socket.end();
					});
				}

				socket.on('end', function() {
					assist.log('=== TCP - Read - File Size: ' + size_count + ' bytes');
				});
				break;

			default:
				assist.log('Undefined command.');
		}
	});
	
});

function start() {
	tcp_server.listen(config.tcp_port);
}

function stop() {
	tcp_server.close();
}

function sendBackup(option, path) {
	var client = net.connect(option, function() {
		client.write(JSON.stringify({
			'action': 'backup',
			'path': path
		}));

		client.end();
	});
}