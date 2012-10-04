'use strict';

var os = require('os');

exports.tcp_port = 6000;
exports.udp_port = 6001;
exports.broadcast = '127.255.255.255';
exports.ip_list = getIP();
exports.hash = messString(8);

function getIP() {
  var ip = new Array();
  var ifaces = os.networkInterfaces();

  for(var dev in ifaces) {
    var alias = 0;
    ifaces[dev].forEach(function(details) {
      if(details.family == 'IPv4' && details.address != '127.0.0.1')
        ip[alias++] = details.address;
    });
  }

  return ip;
}

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

