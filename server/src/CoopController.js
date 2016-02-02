var async = require('async'),
	i2c = require('i2c'),
	WeatherService = require('./WeatherService.js'),
	log = require('./logger.js')();

function CoopController(config, weatherService) {
	this.i2cAddress = 0x05;
	log.debug({address: this.i2cAddress}, 'Joining i2C bus');
	this.wire = new i2c(config.i2cAddress, {device: '/dev/i2c-1', debug: false}); // point to your i2c address, debug provides REPL interface
	this.messageInProgress = false;
	this.sunsetDeltaMinutes = config.sunsetDeltaMinutes;
	this.sunriseDeltaMinutes = config.sunriseDeltaMinutes;
	this.weatherService = weatherService;
	this.commandQueue = [];
	setTimeout(this.checkCoop.bind(this), 1000);

	setInterval(this.checkCoop.bind(this), config.coopPollingInterval * 1000);

	this.serviceCommands();
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

	serviceCommands: function() {
		log.trace('Entering serviceCommands');
		var self = this;
		var nextCommands = self.commandQueue;
		self.commandQueue = [];
		log.trace({numCommands: nextCommands.length}, 'Going to service the next Commands');
		async.eachSeries(nextCommands, function(command, callback) {
			log.trace({command: command}, 'Servicing next command');
			self.sendCommand(command.command, command.args, function(err, data) {
				if(err) {
					log.error({err: err, command: command}, 'Error sending command');
				} else {
					log.info({command: command}, 'Command succeeded');
				}
				command.callback(err, data);

				// keep processing commands even if there was an error
				// with a delay in between to keep the i2c bus sane
				setTimeout(callback, 100);
			});
		}, function(err, results) {
			if(err) {
				log.error({err: err}, 'Error service commands');
			}
			setTimeout(self.serviceCommands.bind(self), 1000);
		});
	},

	requestCommand: function(command, args, callback) {
		this.commandQueue.push({command: command, args: args, callback: callback});
	},

	echo: function(args, callback) {
		this.requestCommand(0, args, callback);
	},
	reset: function(callback) {
		this.requestCommand(1, [], callback);
	},
	readTemp: function(callback) {
		this.requestCommand(2, [], callback);
	},
	readLight: function(callback) {
		this.requestCommand(3, [], callback);
	},
	readDoor: function(callback) {
		this.requestCommand(4, [], callback);
	},
	closeDoor: function(callback) {
		this.requestCommand(5, [], callback);
	},
	openDoor: function(callback) {
		this.requestCommand(6, [], callback);
	},
	autoDoor: function(callback) {
		this.requestCommand(7, [], callback);
	},
	readUptime: function(callback) {
		this.requestCommand(8, [], callback);
	},
	checkCoop: function() {
		var self = this;
		var currentTime = new Date();
		var currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

		self.readDoor(function(err, state) {
			if(err) {
				log.error({err: err}, 'Error reading door state');
			} else {
				if(state === 0) {
					// door is open
					if(currentMinutes < self.getOpeningTime() || currentMinutes > self.getClosingTime()) {
						// we need to close the door
						self.closeDoor(function(err) {
							if(err) {
								log.error({err: err}, 'Error closing coop door');
							} else {
								log.info('Closed coop door');
							}
						});						
					}
				} else if(state === 2) {
					// door is closed
					if(currentMinutes > self.getOpeningTime() && currentMinutes < self.getClosingTime()) {
						// we need to open the door
						self.openDoor(function(err) {
							if(err) {
								log.error({err: err}, 'Error opening coop door');
							} else {
								log.info('Opened coop door');
							}
						});						
					}
				} else {
					log.info('Read door in transition, doing nothing');
				}	
			}
		});
	},
	getClosingTime: function() {
		var ret = null;
		var sunset = this.weatherService.getSunset();
		if(sunset) {
			var sunsetMinutes = Number(sunset.hour) * 60 + Number(sunset.minute);
			ret = sunsetMinutes + this.sunsetDeltaMinutes;
		}
		return ret;
	},
	getOpeningTime: function() {
		var ret = null;
		var sunrise = this.weatherService.getSunrise();
		if(sunrise) {
			var sunriseMinutes = Number(sunrise.hour) * 60 + Number(sunrise.minute);
			ret = sunriseMinutes + this.sunriseDeltaMinutes;
		}
		return ret;
	}
};

module.exports = CoopController;