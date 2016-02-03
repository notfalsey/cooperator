var async = require('async'),
	i2c = require('i2c'),
	WeatherService = require('./WeatherService.js'),
	log = require('./logger.js')();

function CoopController(config, weatherService) {
	log.info('Initializing coop controller');
	this.i2cAddress = 0x05;
	log.debug({address: this.i2cAddress}, 'Joining i2C bus');
	this.messageInProgress = false;
	this.sunsetDeltaMinutes = config.sunsetDeltaMinutes;
	this.sunriseDeltaMinutes = config.sunriseDeltaMinutes;
	this.weatherService = weatherService;
	this.commandQueue = [];
	
	this.state = {
		light: null,
		door: null,
		uptime: null,
		temp: null
	};

	this.commands = {
		echo: 0,
		reset: 1,
		readTemp: 2,
		readLight: 3,
		readDoor: 4,
		shutDoor: 5,
		openDoor: 6,
		autoDoor: 7,
		readUptime: 8
	};

	this.syncLoop();
}

CoopController.prototype = {

	sendCommand: function(wire, command, args, callback) {
		log.trace('Entering sendCommand');
		var self = this;
		if(!self.messageInProgress) {
			self.messageInProgress = true;
			log.debug({command: command, args: args}, 'Sending i2C command');
			try {
				wire.writeBytes(command, args, function(err) {
					if(err) {
						self.messageInProgress = false;
						var msg = 'Error writing data to i2c bus';
						log.error({command: command, args: args, err: err}, msg);
						callback(new Error(msg));
					} else {
						setTimeout(function() {
							wire.read(4, function(err, readBytes) {
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
			} catch(err) {
				self.messageInProgress = false;
				log.error({err: err}, 'Exception occurred trying to send i2c command');
				callback(new Error(err));
			}
		} else {
			var msg = 'Error: i2c message in progress';
			log.error({command: command, args: args}, msg);
			callback(new Error(msg));
		}
	},

	// update all of the readable state from the coop
	syncLoop: function() {
		log.trace('Entering updateState');
		var self = this;
		var delayBetween = 100;
		var wire = new i2c(self.i2cAddress, {device: '/dev/i2c-1', debug: false}); // point to your i2c address, debug provides REPL interface
		async.whilst(
			function() { return true; },
			function(callback) {
				// reset the wire on each batch of commands to keep a healthy state
				//var wire = new i2c(self.i2cAddress, {device: '/dev/i2c-1', debug: false}); // point to your i2c address, debug provides REPL interface
				async.series([
						function(callback) {
							log.trace('Servicing queued commands');
							async.eachSeries(self.commandQueue, function(command, callback) {
								self.sendCommand(wire, command.command, command.args, function(err) {
									// always keep going even if error
									setTimeout(callback, delayBetween);
								});			
							}, function(err, results) {
								if(err) {
									log.error({err: err}, 'Error servicing queued commands');
								}
								// always keep going even if error
								callback(null);
							});
						},
						function(callback) {
							log.trace('Updating door');
							self.sendCommand(wire, self.commands.readDoor, [], function(err, door) {
								if(err) {
									log.error('Error reading door');
								} else {
									self.state.door = door;
								}
								// always keep going even if error
								setTimeout(callback, delayBetween);
							});		
						},
						function(callback) {
							log.trace('Updating uptime');
							self.sendCommand(wire, self.commands.readUptime, [], function(err, uptime) {
								if(err) {
									log.error('Error reading uptime');
								} else {
									self.state.uptime = uptime;
								}
								// always keep going even if error
								setTimeout(callback, delayBetween);
							});		
						},
						function(callback) {
							log.trace('Updating light');
							self.sendCommand(wire, self.commands.readLight, [], function(err, light) {
								if(err) {
									log.error('Error reading light');
								} else {
									self.state.light = light;
								}
								// always keep going even if error
								setTimeout(callback, delayBetween);
							});		
						},
						/*function(callback) {
							log.trace('Updating temperature');
							self.sendCommand(wire, self.commands.readTemp, [], function(err, temp) {
								if(err) {
									log.error('Error reading temp');
								} else {
									self.state.temp = temp;
								}
								// always keep going even if error
								setTimeout(callback, delayBetween);
							});	
						},*/
						function(callback) {
							log.trace('checking door');
							self.checkDoor(wire, self.state.door, function(err) {
								if(err) {
									log.error('Error checking door');
								}
								// always keep going even if error
								setTimeout(callback, delayBetween);
							});
						}
					], function(err, results) {
						if(err) {
							log.error({err: err}, 'Error in sync');
						} else {
							log.trace('sync succeeded');
						}
						// always keep going even if error
						setTimeout(callback, 1000);
						// reset the wire on each batch of commands to keep a healthy state
						//wire.close();
					});
			}, function(err, results) {
				// this should never stop
				log.error({err: err}, 'Error in syncLoop');
			});
	},

	requestCommand: function(command, args, callback) {
		log.trace('Entering requestCommand');
		this.commandQueue.push({command: command, args: args, callback: callback});
	},

	readLight: function() {
		return this.state.light;
	},
	readTemp: function() {
		return this.state.temp;
	},
	readDoor: function() {
		return this.state.door;
	},
	readUptime: function(callback) {
		return this.state.uptime;
	},
	echo: function(args, callback) {
		this.requestCommand(this.commands.echo, args, callback);
	},
	reset: function(callback) {
		this.requestCommand(this.commands.reset, [], callback);
	},
	closeDoor: function(callback) {
		this.requestCommand(this.commands.closeDoor, [], callback);
	},
	openDoor: function(callback) {
		this.requestCommand(this.commands.openDoor, [], callback);
	},
	autoDoor: function(callback) {
		this.requestCommand(this.commands.autoDoor, [], callback);
	},
	checkDoor: function(wire, state, callback) {
		log.trace('Entering checkCoop');
		var self = this;
		var currentTime = new Date();
		var currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

		var openingTime = self.getOpeningTime();
		var closingTime = self.getClosingTime();

		if(closingTime !== null && openingTime !== null)
		{
			if(state === 0) {
				log.trace('Door is open');
				// door is open
				if(currentMinutes < openingTime || currentMinutes > closingTime) {
					log.info('Sending command to close door');
					// we need to close the door
					self.sendCommand(wire, self.commands.closeDoor, [], function(err) {
						if(err) {
							log.error({err: err}, 'Error closing coop door');
						} else {
							log.info('Closed coop door');
						}
						callback(err);
					});			
					return;			
				}
			} else if(state === 2) {
				log.trace('Door is closed');
				// door is closed
				if(currentMinutes > openingTime && currentMinutes < closingTime) {
					log.info('Sending command to open door');
					// we need to open the door
					self.sendCommand(wire, self.commands.openDoor, [], function(err) {
						if(err) {
							log.error({err: err}, 'Error opening coop door');
						} else {
							log.info('Opened coop door');
						}
						callback(err);
					});		
					return;				
				}
			} else {
				log.info('Read door in transition, doing nothing');
			}	
		} else {
			log.warn('Did not have a valid closing or opening time');
		}
		callback(null);
	},
	getClosingTime: function() {
		log.trace('Entering getClosingTime');
		var ret = null;
		var sunset = this.weatherService.getSunset();
		if(sunset) {
			var sunsetMinutes = Number(sunset.hour) * 60 + Number(sunset.minute);
			ret = sunsetMinutes + this.sunsetDeltaMinutes;
		}
		return ret;
	},
	getOpeningTime: function() {
		log.trace('Entering getOpeningTime');
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