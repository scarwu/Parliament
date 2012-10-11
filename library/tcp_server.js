'use strict'

// Require module
var fs = require('fs');
var net = require('net');
var util = require('util');
var dgram = require('dgram');

var mysql = require('mysql-libmysqlclient');

// Require custom module
var config = require('../config');

// Module Exports
exports.start = start;
exports.stop = stop;

// File system extend
fs.copy = function (src, dst, callback) {
	function copy(error) {
		var input_stream;
		var output_stream;

		if (!error) {
			return callback(new Error("File " + dst + " exists."));
		}

		fs.stat(src, function (error) {
			if (error)
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
				socket.write(JSON.stringify(status.member));
				socket.pipe(socket);
				break;

			// Delete file
			case 'delete':
				var path = config.target + data.path;
				var conn = mysql.createConnectionSync();
				conn.connectSync(config.db.host, config.db.user, config.db.pass, config.db.name, config.db.port);

				if(fs.existsSync(path)) {
					fs.unlink(path);



					if(conn.connectedSync())
						conn.closeSync();
				}
				break;

			// Backup file
			case 'backup':
				var path = config.target + data.path;

				console.log('Command Backup: ' + data.path);

				// Send Command: Read
				var client = net.connect({
					'port': config.tcp_port,
					'host': socket.remoteAddress
				}, function() {
					client.write(JSON.stringify({
						'action': 'read',
						'path': data.path
					}));
				});
				
				client.on('data', function(file) {

					fs.writeFile(path, file, function(error) {
						var conn = mysql.createConnectionSync();
						conn.connectSync(config.db.host, config.db.user, config.db.pass, config.db.name, config.db.port);

						var sql = 'SELECT entity FROM relation WHERE path="' + data.path + '"';
						var entity = conn.querySync(sql).fetchAllSync()[0]['entity'] + '|' + config.hash;

						var sql = 'UPDATE relation SET entity="' + entity + '" WHERE path="' + data.path + '"';
						conn.query(sql);

						client.end();
					});

				});

				break;

			// Create file
			case 'create':
				var path = config.target + data.path;
				var conn = mysql.createConnectionSync();
				conn.connectSync(config.db.host, config.db.user, config.db.pass, config.db.name, config.db.port);

				console.log('Command Create: ' + data.path);

				if(fs.existsSync(path))
					fs.unlink(path);

				fs.copy(data.src, path, function(error) {
					if(!error) {
						var sql = 'INSERT INTO relation (path, entity) VALUES ("' + data.path + '", "' + config.hash + '");';
						conn.query(sql);
						
						// Call anothor server backup file
						var count = 0;
						for(var hash in status.member)
							if(hash != config.hash) {
								var client = net.connect({
									'port': config.tcp_port,
									'host': status.member[hash]['ip']
								}, function() {
									client.write(JSON.stringify({
										'action': 'backup',
										'path': data.path
									}));
									client.end();
								});

								if(++count >= config.backup)
									break;
							}
					}
				});
				
				break;

			// Read file
			case 'read':
				var path = config.target + data.path;

				console.log('Command Read: ' + data.path);

				if(fs.existsSync(path))
					fs.readFile(path, null, function(error, data) {
						socket.write(data);
						socket.pipe(socket);
					});
				else {
					var conn = mysql.createConnectionSync();
					conn.connectSync(config.db.host, config.db.user, config.db.pass, config.db.name, config.db.port);

					var sql = 'SELECT entity FROM relation WHERE path="' + data.path + '"';
					var entity = conn.querySync(sql).fetchAllSync()[0]['entity'].split('|');

					var client = net.connect({
						'port': config.tcp_port,
						'host': status.member[entity[0]]['ip']
					}, function() {
						client.write(JSON.stringify({
							'action': 'read',
							'path': data.path
						}));
					});
					
					client.on('data', function(file) {
						socket.write(file);
						socket.pipe(socket);
					});
				}
				break;

			default:
				console.log('Undefined command.');
		}
	});
	
	socket.on('error', function() {
		
	});
	
});

function start() {
	tcp_server.listen(config.tcp_port);
}

function stop() {
	tcp_server.close();
}
