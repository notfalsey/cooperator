var async = require('async'),
	i2c = require('./i2cWrapper.js'),
	NotifyService = require('./NotifyService.js'),
	log = require('./logger.js')();

function CoopController(config, weatherService) {
	log.info('Initializing coop controller');
	this.i2cAddress = 0x05;
	log.debug({address: this.i2cAddress}, 'Using i2C address');
	this.messageInProgress = false;
	this.sunsetDeltaMinutes = config.sunsetDeltaMinutes;
	this.sunriseDeltaMinutes = config.sunriseDeltaMinutes;
	this.weatherService = weatherService;
	this.enableMailNotify = config.enableMailNotify;
	this.notifyService = new NotifyService(config);
	this.commandQueue = [];
	this.writeErrorCount = 0;
	this.readErrorCount = 0;
	this.autoResetCount = 0;
	this.lastSuccessfulRead = -1;
	this.lastSuccessfulWrite = -1;
	this.lastError = -1;
	this.longestUptime = 0;
	this.timeToTransition = 15000;
	this.activeDoorCommand = -1;
	this.doorCommandExpiration = null;
	this.lastNonErrorDoorState = null;

	this.doorStates = {
		open: 0,
		transitioning: 1,
		closed: 2
	};
	
	this.state = {
		light: -1,
		door: -1,
		uptime: -1,
		temp: -1,
		mode: -1,
		closing: false,
		opening: false
	};

	this.commands = {
		echo: 0,
		reset: 1,
		readTemp: 2,
		readLight: 3,
		readDoor: 4,
		closeDoor: 5,
		openDoor: 6,
		autoDoor: 7,
		readUptime: 8,
		readMode: 9
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
						self.lastError = new Date();
						self.writeErrorCount++;
						self.messageInProgress = false;
						var msg = 'Error writing data to i2c bus';
						log.error({command: command, args: args, err: err}, msg);
						callback(new Error(msg));
					} else {
						self.lastSuccessfulWrite = new Date();
						setTimeout(function() {
							log.trace('Reading i2C command response');
							wire.read(4, function(err, readBytes) {
								self.messageInProgress = false;
								if(err) {
									self.lastError = new Date();
									self.readErrorCount++;
									var msg = 'Error reading data from i2c bus';
									log.error({command: command, args: args, err: err}, msg);
									callback(new Error(msg));
								} else {
									self.lastSuccessfulRead = new Date();
									var reading = (readBytes[0]<<24) + (readBytes[1]<<16) + (readBytes[2]<<8) + readBytes[3];
									log.debug({command: command, args: args, readBytes: readBytes, reading: reading}, 'Read data from i2c bus');
									callback(null, reading);
								}
							});
						}, 100);
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
		log.debug({address: self.i2cAddress}, 'Joining i2C bus');
		var wire = new i2c(self.i2cAddress, {device: '/dev/i2c-1', debug: false}); // point to your i2c address, debug provides REPL interface
		async.whilst(
			function() { return true; },
			function(callback) {
				// reset the wire on each batch of commands to keep a healthy state
				//var wire = new i2c(self.i2cAddress, {device: '/dev/i2c-1', debug: false}); // point to your i2c address, debug provides REPL interface
				async.series([
						function(callback) {
							log.trace({commandLength: self.commandQueue.length}, 'Servicing queued commands');
							var commandsToService = self.commandQueue;
							self.commandQueue = [];
							async.eachSeries(commandsToService, function(command, callback) {
								log.trace({command: command}, 'Sending command');
								self.sendCommand(wire, command.command, command.args, function(err) {
									if(command.command === self.commands.reset) {
										self.state.uptime = -1;
									}
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
						// read uptime before other state so we know if the coop was recently reset before reading others
						function(callback) {
							log.trace('Reading uptime');
							self.sendCommand(wire, self.commands.readUptime, [], function(err, uptime) {
								if(err) {
									log.error('Error reading uptime');
								} else {
									if(uptime > self.longestUptime) {
										self.longestUptime = uptime;
									}
									if(uptime < self.state.uptime && self.state.uptime < (Math.pow(2,32)-10000)) {
										self.autoResetCount++;
										log.error({uptime: uptime, lastUptime: self.state.uptime}, 'Coop controller reset');
									}
									self.state.uptime = uptime;
								}
								// always keep going even if error
								setTimeout(callback, delayBetween);
							});		
						},
						function(callback) {
							log.trace('Reading door state');
							self.sendCommand(wire, self.commands.readDoor, [], function(err, door) {
								if(err) {
									log.error('Error reading door');
									self.state.door = -1;
								} else {
									// first lets compare current state against previous state and send a notification of state change if necessary
									if(self.enableMailNotify === true && self.lastNonErrorDoorState === self.doorStates.transitioning) {
										if(door === self.doorStates.open) {
											self.notifyService.notify('Door opened');
										} else if(door === self.doorStates.closed) {
											self.notifyService.notify('Door closed');
										}
									}
									self.lastNonErrorDoorState = self.state.door = door;
								}
								// always keep going even if error
								setTimeout(callback, delayBetween);
							});		
						},
						function(callback) {
							log.trace('Reading override mode');
							self.sendCommand(wire, self.commands.readMode, [], function(err, mode) {
								if(err) {
									log.error('Error reading override mode');
									self.state.mode = -1;
								} else {
									self.state.mode = mode;
								}
								// always keep going even if error
								setTimeout(callback, delayBetween);
							});		
						},
						function(callback) {
							log.trace('Reading light');
							self.sendCommand(wire, self.commands.readLight, [], function(err, light) {
								if(err) {
									log.error('Error reading light');
									self.state.light = -1;
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
	readMode: function(callback) {
		return this.state.mode;
	},
	echo: function(args, callback) {
		this.requestCommand(this.commands.echo, args, callback);
	},
	reset: function(callback) {
		this.requestCommand(this.commands.reset, [], callback);
	},
	closeDoor: function(callback) {
		log.trace('Entering closeDoor');
		this.activeDoorCommand = this.commands.closeDoor;
		this.doorCommandExpiration = this.getDoorCommandExpiration();
		log.info({expiration: this.doorCommandExpiration}, 'Requesting close door');
		this.requestCommand(this.commands.closeDoor, [], callback);
	},
	openDoor: function(callback) {
		log.trace('Entering openDoor');
		this.activeDoorCommand = this.commands.openDoor;
		this.doorCommandExpiration = this.getDoorCommandExpiration();
		log.info({expiration: this.doorCommandExpiration}, 'Requesting open door');
		this.requestCommand(this.commands.openDoor, [], callback);
	},
	autoDoor: function(callback) {
		log.trace('Entering autoDoor');
		this.requestCommand(this.commands.autoDoor, [], callback);
	},
	isClosing: function(callback) {
		return this.state.closing;
	},
	isOpening: function(callback) {
		return this.state.opening;
	},
	getCurrentMinutes: function(currentTime) {
		return currentTime.getHours() * 60 + currentTime.getMinutes();
	},
	getDoorCommandExpiration: function() {
		log.trace('Entering getDoorCommandExpiration');
		var currentTime = new Date();
		var sunrise = this.weatherService.getSunrise();
		var sunset = this.weatherService.getSunset();
		var currentMins = this.getCurrentMinutes(currentTime);
		var ret = null;
		if(currentMins <= this.getOpeningTime()) {
			// today sunrise
			ret = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), sunrise.hour, sunrise.minute);
			log.trace({ret: ret}, 'Returning from getDoorCommandExpiration with todays sunrise');
			return ret;
		} else if(currentMins > this.getOpeningTime() && currentMins < this.getClosingTime()) {
			// today sunset
			ret = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), sunset.hour, sunset.minute);
			log.trace({ret: ret}, 'Returning from getDoorCommandExpiration with todays sunset');
			return ret;
		}
		// else tomorrow sunrise
		var todaySunrise = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), sunrise.hour, sunrise.minute);
		ret = new Date(todaySunrise.getTime() + 24*60*60*1000);
		log.trace({ret: ret}, 'Returning from getDoorCommandExpiration with tomorrows sunrise');
		return ret;
	},
	checkDoor: function(wire, state, callback) {
		log.trace('Entering checkCoop');
		var self = this;
		var currentTime = new Date();
		// check if last manual door command needs to expire
		if(self.activeDoorCommand !== -1 && currentTime.getTime() >= self.doorCommandExpiration.getTime()) {
			log.info({command: self.activeDoorCommand}, 'Manual door command expired, resetting it');
			self.activeDoorCommand = -1;
			self.doorCommandExpiration = null;
		}
		var currentMinutes = self.getCurrentMinutes(currentTime);

		var openingTime = self.getOpeningTime();
		var closingTime = self.getClosingTime();

		if(self.activeDoorCommand !== -1) {
			// there is an active manual door command, so honor it
			log.trace({ command: self.activeDoorCommand}, 'Sending manual command to door');
			self.sendCommand(wire, self.activeDoorCommand, [], function(err) {
				if(err) {
					log.error({err: err}, 'Error sending manual door commands');
				} else {
					log.trace('Send manual door command');
				}
				callback(err);
			});

		} else if(closingTime !== null && openingTime !== null) {
			// if we have an auto open time and close time and there is no active manual door command
			if(currentMinutes < openingTime || currentMinutes > closingTime) {
				log.trace('Sending command to close door');
				// we need to close the door
				self.sendCommand(wire, self.commands.closeDoor, [], function(err) {
					if(err) {
						log.error({err: err}, 'Error closing coop door');
					} else {
						log.info('Closed coop door');
					}
					callback(err);
				});
			} else {	
				log.trace('Sending command to open door');
				// we need to open the door
				self.sendCommand(wire, self.commands.openDoor, [], function(err) {
					if(err) {
						log.error({err: err}, 'Error opening coop door');
					} else {
						log.info('Opened coop door');
					}
					callback(err);
				});
			}	
		} else {
			var msg = 'Did not have a valid closing or opening time';
			log.warn(msg);
			callback(new Error(msg));
		}
		
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
	},
	getReadErrorCount: function() {
		return this.readErrorCount;
	},
	getWriteErrorCount: function() {
		return this.writeErrorCount;
	},
	getAutoResetCount: function() {
		return this.autoResetCount;
	},
	getLastSuccessfulRead: function() {
		return this.lastSuccessfulRead;
	},
	getLastSuccessfulWrite: function() {
		return this.lastSuccessfulWrite;
	},
	getLastError: function() {
		return this.lastError;
	},
	getLongestUptime: function() {
		return this.longestUptime;
	}
};

module.exports = CoopController;