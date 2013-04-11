'use strict'

// Require module
var fs = require('fs');
var net = require('net');
var util = require('util');

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
 * Find Unique ID is exists
 */
exports.exists = function(data, socket) {
	var status = global._status;
	var exists = data.unique_id in status.all_unique;

	assist.log('--> TCP: Exists - FIle: ' + data.unique_id + ' ' + exists);
	socket.write(JSON.stringify({
		'exists': exists
	}));
	socket.end();
}

/**
 * Read File or Redirect
 */
exports.read = function(data, socket) {
	var status = global._status;
	
	assist.log('--> TCP: Read');

	if(data.unique_id in status.sub_unique) {
		assist.log('<-- TCP: Read - File: ' + data.unique_id);

		var path = config.target + '/' +  data.unique_id.replace('/', '');

		// File Stream to Net Stream
		var read_stream = fs.createReadStream(path);
		read_stream.pipe(socket);

		socket.on('end', function() {
			assist.log('=== TCP: Read - File Size: ' + fs.statSync(path).size + ' bytes');
		});
	}
	else if(data.unique_id in status.all_unique) {
		assist.log('<-- TCP: Read - Read - File: ' + data.unique_id);

		// Compare DB table and Member List
		var entity_list = new Array();
		for(var hash in status.member) {
			if(hash in status.all_unique[data.unique_id])
				entity_list.push(hash);
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

	var status = global._status;
	
	assist.log('--> TCP: Create - File: ' + data.unique_id);

	if(data.unique_id in status.all_unique) {
		socket.end();
		return false;
	}

	var path = config.target + '/' +  data.unique_id.replace('/', '');

	fs.copy(data.source, path, function(error) {
		if(error) {
			socket.end();
			return false;
		}

		assist.log('=== TCP: Create - File Size: ' + fs.statSync(path).size + ' bytes');
		assist.log('=== TCP: Create - Record write-back: ' + data.unique_id);

		if(status.all_unique[data.unique_id] == undefined)
			status.all_unique[data.unique_id] = {};

		// Racord unique
		status.sub_unique[data.unique_id] = 1;
		status.all_unique[data.unique_id][config.hash] = 1;
		
		// Send Record append
		for(var hash in status.member)
			if(hash != config.hash)
				send_record_append({
					'port': config.tcp_port,
					'host': status.member[hash].ip
				}, data.unique_id);

		// Call anothor server backup file
		var count = 0;
		for(var hash in status.member)
			if(hash != config.hash) {
				assist.log('<-- TCP: Backup - IP: ' + status.member[hash].ip);

				//FIXME need follow index value
				send_backup({
					'port': config.tcp_port,
					'host': status.member[hash].ip
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

	var status = global._status;

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
	
	var path = config.target + '/' +  data.unique_id.replace('/', '');

	// Net Stream to File Stream
	var write_stream = fs.createWriteStream(path);
	client.pipe(write_stream);

	client.on('end', function() {
		if(fs.existsSync(path)) {
			assist.log('=== TCP: Backup - Read - File Size: ' + fs.statSync(path).size + ' bytes');
			assist.log('=== TCP: Backup - Record write-back: ' + data.unique_id);

			if(status.all_unique[data.unique_id] == undefined)
				status.all_unique[data.unique_id] = {};

			// Racord unique
			status.all_unique[data.unique_id][config.hash] = 1;
			status.sub_unique[data.unique_id] = 1;

			// Send Record append
			for(var hash in status.member)
				if(hash != config.hash)
					send_record_append({
						'port': config.tcp_port,
						'host': status.member[hash].ip
					}, data.unique_id);
		}
	});
}

/**
 * Delete File
 */
exports.delete = function(data, socket) {
	socket.end();

	var status = global._status;
	var path = config.target + '/' +  data.unique_id.replace('/', '');

	// FIXME file check
	if(data.unique_id in status.sub_unique)
		fs.unlink(path, function(error) {
			if(error) {
				socket.end();
				return false;
			}

			assist.log('--> TCP: Delete - File: ' + data.unique_id);

			delete status.sub_unique[data.unique_id];
			delete status.all_unique[data.unique_id][config.hash];

			if(Object.keys(status.all_unique[data.unique_id]) == 0)
				delete status.all_unique[data.unique_id];

			// Send Record delete
			for(var hash in status.member)
				if(hash != config.hash)
					send_record_delete({
						'port': config.tcp_port,
						'host': status.member[hash].ip
					}, data.unique_id);

			if(data.unique_id in status.all_unique) {
				for(var hash in status.all_unique[data.unique_id]) {
					assist.log('--> TCP: Delete - Next - File: ' + data.unique_id);
					send_delete({
						'port': config.tcp_port,
						'host': status.member[hash].ip
					}, data.unique_id);
					break;
				}
			}
		});
	else if(data.unique_id in status.all_unique) {
		assist.log('--> TCP: Delete - Redirect - File: ' + data.unique_id);

		for(var hash in status.all_unique[data.unique_id]) {
			send_delete({
				'port': config.tcp_port,
				'host': status.member[hash].ip
			}, data.unique_id);
			break;
		}
	}
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

/**
 * Get all unique record
 */
exports.all_unique = function(data, socket) {
	assist.log('<-- TCP: All Unique');

	var status = global._status;

	socket.write(JSON.stringify(status.all_unique));
	socket.end();

	socket.on('end', function() {
		assist.log('<-- TCP: Unique - End');
	});
}

exports.sub_unique = function(data, socket) {
	assist.log('<-- TCP: Sub Unique');

	var status = global._status;

	socket.write(JSON.stringify(status.sub_unique));
	socket.end();

	socket.on('end', function() {
		assist.log('<-- TCP: Unique - End');
	});
}

/**
 * Merge reocrd
 */
exports.record_merge = function(data, socket) {
	socket.end();

	assist.log('--> TCP: Record Merge');

	var status = global._status;
	var client = net.connect({
		'port': config.tcp_port,
		'host': socket.remoteAddress
	}, function() {
		client.write(JSON.stringify({
			'action': 'sub_unique'
		}));
	});

	var json_stream = require('JSONStream').parse();
	client.pipe(json_stream);

	json_stream.on('data', function(unique) {
	    assist.log('--> TCP: Record Merge: End');

		for(var id in unique) {
			if(status.all_unique[id] == undefined)
				status.all_unique[id] = {};

			status.all_unique[id][data.hash] = 1;
		}

		client.end();
	});
}

/**
 * Append reocrd
 */
exports.record_append = function(data, socket) {
	socket.end();

	assist.log('--> TCP: Record Append');

	var status = global._status;

	if(status.all_unique[data.unique] == undefined)
		status.all_unique[data.unique] = {};

	status.all_unique[data.unique][data.hash] = 1;
}

/**
 * Delet record
 */
exports.record_delete = function(data, socket) {
	socket.end();

	assist.log('--> TCP: Record Delete');

	var status = global._status;

	delete status.all_unique[data.unique][data.hash];

	if(Object.keys(status.all_unique[data.unique]) == 0)
		delete status.all_unique[data.unique];
}

function send_record_append(option, unique) {
	var client = net.connect(option, function() {
		client.write(JSON.stringify({
			'action': 'record_append',
			'hash': config.hash,
			'unique': unique
		}));

		client.end();
	});
}

function send_record_delete(option, unique) {
	var client = net.connect(option, function() {
		client.write(JSON.stringify({
			'action': 'record_delete',
			'hash': config.hash,
			'unique': unique
		}));

		client.end();
	});
}