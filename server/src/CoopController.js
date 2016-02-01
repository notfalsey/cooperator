var i2c = require('i2c'),
	log = require('./logger.js')();

function CoopController(config) {
	this.i2cAddress = 0x05;
	log.debug({address: this.i2cAddress}, 'Joining i2C bus');
	this.wire = new i2c(config.i2cAddress, {device: '/dev/i2c-1', debug: false}); // point to your i2c address, debug provides REPL interface
	this.messageInProgress = false;
}

CoopController.prototype = {
	sendCommand: function(command, args, callback) {
		var self = this;
		if(!self.messageInProgress) {
			log.debug({command: command, args: args}, 'Sending i2C command');
			self.messageInProgress = true;
			self.wire.writeBytes(command, args, function(err) {
				if(err) {
					var msg = 'Error writing data to i2c bus';
					log.error({command: command, args: args, err: err}, msg);
					self.messageInProgress = false;
					callback(new Error(msg));
				} else {
					setTimeout(function() {
						self.wire.read(4, function(err, readBytes) {
							self.messageInProgress = false;
							if(err) {
								var msg = 'Error reading data from i2c bus';
								log.error({command: command, args: args, err: err}, msg);
								callback(new Error(msg));
							} else {
								var reading = (readBytes[0]<<24) + (readBytes[1]<<16) + (readBytes[2]<<8) + readBytes[3];
								log.debug({command: command, args: args, readBytes: readBytes, reading: reading}, 'Read data from i2c bus');
								callback(null, reading);
							}
						});
					}, 50);
				}
			});	
		} else {
			var msg = 'Error: i2c message in progress';
			log.error({command: command, args: args}, msg);
			callback(new Error(msg));
		}
	},
	echo: function(args, callback) {
		this.sendCommand(0, args, callback);
	},
	reset: function(callback) {
		this.sendCommand(1, [], callback);
	},
	readTemp: function(callback) {
		this.sendCommand(2, [], callback);
	},
	readLight: function(callback) {
		this.sendCommand(3, [], callback);
	},
	readDoor: function(callback) {
		this.sendCommand(4, [], callback);
	},
	closeDoor: function(callback) {
		this.sendCommand(5, [], callback);
	},
	openDoor: function(callback) {
		this.sendCommand(6, [], callback);
	},
	autoDoor: function(callback) {
		this.sendCommand(7, [], callback);
	},
	readUptime: function(callback) {
		this.sendCommand(8, [], callback);
	}
};

module.exports = CoopController;