'use strict';

var async = require('async'),
    Promise = require('bluebird'),
    i2c = require('./i2cWrapper.js'),
    log = require('./logger.js')();

// config: key/value object with sunsetDeltaMinutes, sunriseDeltaMinutes, enableMailNotify
// weatherService: weatherunderground service wrapper
// notifyService: notification service with notify() method
// i2c: i2c wire wrapper with read/writeBytes methods
class CoopController {

    constructor(config, weatherService, notifyService, customI2c) {
        log.info('Initializing coop controller');
        if (customI2c) {
            log.info('Using custom i2c implementation');
            this.i2c = customI2c;
        } else {
            log.info('Using default i2c wrapper');
            this.i2c = i2c;
        }
        this.i2cAddress = 0x05;
        log.debug({
            address: this.i2cAddress
        }, 'Using i2C address');
        this.messageInProgress = false;
        this.sunsetDeltaMinutes = config.sunsetDeltaMinutes;
        this.sunriseDeltaMinutes = config.sunriseDeltaMinutes;
        this.weatherService = weatherService;
        this.enableNotify = config.enableNotify;
        this.notifyService = notifyService;
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

    sendCommand(wire, command, args) {
        log.trace('Entering sendCommand');
        if (!this.messageInProgress) {
            this.messageInProgress = true;
            log.debug({
                command: command,
                args: args
            }, 'Sending i2C command');

            return wire.writeBytes(command, args)
                .then(() => {
                    this.lastSuccessfulWrite = new Date();
                    return new Promise((resolve, reject) => {
                        setTimeout(resolve, 100);
                    });
                })
                .then(() => {
                    return wire.read(4)
                        .then((readBytes) => {
                            this.messageInProgress = false;
                            this.lastSuccessfulRead = new Date();
                            var reading = (readBytes[0] << 24) + (readBytes[1] << 16) + (readBytes[2] << 8) + readBytes[3];
                            log.debug({
                                command: command,
                                args: args,
                                readBytes: readBytes,
                                reading: reading
                            }, 'Read data from i2c bus');
                            return reading;
                        })
                        .catch((err) => {
                            this.lastError = new Date();
                            this.readErrorCount++;
                            log.error({
                                command: command,
                                args: args,
                                err: err
                            }, 'Error reading data from i2c bus');
                            throw err;
                        });
                })
                .catch((err) => {
                    this.lastError = new Date();
                    this.writeErrorCount++;
                    this.messageInProgress = false;
                    log.error({
                        command: command,
                        args: args,
                        err: err
                    }, 'Error writing data to i2c bus');
                    throw err;
                });
        } else {
            var msg = 'Error: i2c message in progress';
            log.error({
                command: command,
                args: args
            }, msg);
            return Promise.reject(new Error(msg));
        }
    }

    // update all of the readable state from the coop
    syncLoop() {
        log.trace('Entering updateState');
        var delayBetween = 100;
        log.debug({
            address: this.i2cAddress
        }, 'Joining i2C bus');
        var wire = new this.i2c(this.i2cAddress, {
            device: '/dev/i2c-1',
            debug: false
        }); // point to your i2c address, debug provides REPL interface
        async.whilst(
            () => {
                return true;
            },
            (callback) => {
                log.trace({
                    commandLength: this.commandQueue.length
                }, 'Servicing queued commands');
                var commandsToService = this.commandQueue;
                this.commandQueue = [];

                async.eachSeries(commandsToService, (command, callback) => {
                    log.trace({
                        command: command
                    }, 'Sending command');
                    this.sendCommand(wire, command.command, command.args).then((data) => {
                        if (command.command === this.commands.reset) {
                            this.state.uptime = -1;
                        }
                        command.resolve(data);
                        // always keep going even if error
                        setTimeout(callback, delayBetween);
                    }).catch((err) => {
                        log.error({
                            err: err
                        }, 'Error sending command');
                        command.reject(err);
                        // always keep going even if error
                        setTimeout(callback, delayBetween);
                    });
                }, (err) => {
                    // always keep going even if error
                    log.trace('Reading uptime');
                    this.sendCommand(wire, this.commands.readUptime, []).then((uptime) => {
                        if (uptime > this.longestUptime) {
                            this.longestUptime = uptime;
                        }
                        if (uptime < this.state.uptime && this.state.uptime < (Math.pow(2, 32) - 10000)) {
                            this.autoResetCount++;
                            log.error({
                                uptime: uptime,
                                lastUptime: this.state.uptime
                            }, 'Coop controller reset');
                        }
                        this.state.uptime = uptime;
                        return new Promise((resolve, reject) => {
                            setTimeout(resolve, delayBetween);
                        });
                    }).catch((err) => {
                        log.error('Error reading uptime');
                        // always keep going even if error
                        return new Promise((resolve, reject) => {
                            setTimeout(resolve, delayBetween);
                        });
                    }).then(() => {
                        log.trace('Reading door state');
                        return this.sendCommand(wire, this.commands.readDoor, []).then((door) => {
                            // first lets compare current state against previous state and send a notification of state change if necessary
                            if (this.enableNotify === true && this.lastNonErrorDoorState === this.doorStates.transitioning) {
                                if (door === this.doorStates.open) {
                                    log.info('Door is now open');
                                    this.notifyService.notify('Door opened', 'Its a brand new day!')
                                        .then(() => {
                                            log.info('Notification sent');
                                        }).catch((err) => {
                                            log.error({
                                                err: err
                                            }, 'Error sending notification');
                                        });
                                } else if (door === this.doorStates.closed) {
                                    log.info('Door is now closed');
                                    this.notifyService.notify('Door closed', 'Safe and sound.')
                                        .then(() => {
                                            log.info('Notification sent');
                                        }).catch((err) => {
                                            log.error({
                                                err: err
                                            }, 'Error sending notification');
                                        });
                                }
                            }
                            this.lastNonErrorDoorState = this.state.door = door;
                            return new Promise((resolve, reject) => {
                                setTimeout(resolve, delayBetween);
                            });
                        }).catch((err) => {
                            log.error('Error reading door');
                            this.state.door = -1;
                            // always keep going even if error
                            return new Promise((resolve, reject) => {
                                setTimeout(resolve, delayBetween);
                            });
                        });
                    }).then(() => {
                        log.trace('Reading override mode');
                        return this.sendCommand(wire, this.commands.readMode, []).then((mode) => {
                            this.state.mode = mode;
                            return new Promise((resolve, reject) => {
                                setTimeout(resolve, delayBetween);
                            });
                        }).catch((err) => {
                            log.error('Error reading override mode');
                            this.state.mode = -1;
                            // always keep going even if error
                            return new Promise((resolve, reject) => {
                                setTimeout(resolve, delayBetween);
                            });
                        });
                        /*
                        (callback) => {
                            log.trace('Reading light');
                            this.sendCommand(wire, this.commands.readLight, [], (err, light) => {
                                if (err) {
                                    log.error('Error reading light');
                                    this.state.light = -1;
                                } else {
                                    this.state.light = light;
                                }
                                // always keep going even if error
                                setTimeout(callback, delayBetween);
                            });
                        },
                        (callback) => {
                            log.trace('Updating temperature');
                            this.sendCommand(wire, this.commands.readTemp, [], function(err, temp) {
                                if(err) {
                                    log.error('Error reading temp');
                                } else {
                                    this.state.temp = temp;
                                }
                                // always keep going even if error
                                setTimeout(callback, delayBetween);
                            }); 
                        },*/
                    }).then(() => {
                        log.trace('checking door');
                        this.checkDoor(wire, this.state.door).then(() => {
                            return new Promise((resolve, reject) => {
                                setTimeout(resolve, delayBetween);
                            });
                        }).catch((err) => {
                            log.error('Error checking door');
                            // always keep going even if error
                            return new Promise((resolve, reject) => {
                                setTimeout(resolve, delayBetween);
                            });
                        });
                    });
                    log.trace({
                        err: err
                    }, 'sync finished');
                    // always keep going even if error
                    setTimeout(callback, 1000);
                });
            },
            (err) => {
                // this should never stop
                log.error({
                    err: err
                }, 'Error in syncLoop');
            });
    }

    requestCommand(command, args) {
        log.trace('Entering requestCommand');
        return new Promise((resolve, reject) => {
            this.commandQueue.push({
                command: command,
                args: args,
                resolve: resolve,
                reject: reject
            });
        });
    }

    readLight() {
        return this.state.light;
    }

    readTemp() {
        return this.state.temp;
    }

    readDoor() {
        return this.state.door;
    }

    readUptime() {
        return this.state.uptime;
    }

    readMode() {
        return this.state.mode;
    }

    echo(args) {
        log.trace('Entering echo');
        log.info({
            args: args
        }, 'Requesting echo');
        return this.requestCommand(this.commands.echo, args);
    }

    reset() {
        log.trace('Entering reset');
        log.info('Requesting reset');
        return this.requestCommand(this.commands.reset, []);
    }

    closeDoor() {
        log.trace('Entering closeDoor');
        this.activeDoorCommand = this.commands.closeDoor;
        this.doorCommandExpiration = this.getDoorCommandExpiration();
        log.info({
            expiration: this.doorCommandExpiration
        }, 'Requesting close door');
        return this.requestCommand(this.commands.closeDoor, []);
    }

    openDoor() {
        log.trace('Entering openDoor');
        this.activeDoorCommand = this.commands.openDoor;
        this.doorCommandExpiration = this.getDoorCommandExpiration();
        log.info({
            expiration: this.doorCommandExpiration
        }, 'Requesting open door');
        return this.requestCommand(this.commands.openDoor, []);
    }

    autoDoor() {
        log.trace('Entering autoDoor');
        return this.requestCommand(this.commands.autoDoor, []);
    }

    isClosing() {
        return this.state.closing;
    }

    isOpening() {
        return this.state.opening;
    }

    getCurrentMinutes(currentTime) {
        return currentTime.getHours() * 60 + currentTime.getMinutes();
    }

    getDoorCommandExpiration() {
        log.trace('Entering getDoorCommandExpiration');
        var currentTime = new Date();
        var sunrise = this.weatherService.getSunrise();
        var sunset = this.weatherService.getSunset();
        var currentMins = this.getCurrentMinutes(currentTime);
        var ret = null;
        if (currentMins <= this.getOpeningTime()) {
            // today sunrise
            ret = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), sunrise.hour, sunrise.minute);
            log.trace({
                ret: ret
            }, 'Returning from getDoorCommandExpiration with todays sunrise');
            return ret;
        } else if (currentMins > this.getOpeningTime() && currentMins < this.getClosingTime()) {
            // today sunset
            ret = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), sunset.hour, sunset.minute);
            log.trace({
                ret: ret
            }, 'Returning from getDoorCommandExpiration with todays sunset');
            return ret;
        }
        // else tomorrow sunrise
        var todaySunrise = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), sunrise.hour, sunrise.minute);
        ret = new Date(todaySunrise.getTime() + 24 * 60 * 60 * 1000);
        log.trace({
            ret: ret
        }, 'Returning from getDoorCommandExpiration with tomorrows sunrise');
        return ret;
    }

    checkDoor(wire, state) {
        log.trace('Entering checkCoop');
        var currentTime = new Date();
        // check if last manual door command needs to expire
        if (this.activeDoorCommand !== -1 && currentTime.getTime() >= this.doorCommandExpiration.getTime()) {
            log.info({
                command: this.activeDoorCommand
            }, 'Manual door command expired, resetting it');
            this.activeDoorCommand = -1;
            this.doorCommandExpiration = null;
        }
        var currentMinutes = this.getCurrentMinutes(currentTime);

        var openingTime = this.getOpeningTime();
        var closingTime = this.getClosingTime();

        if (this.activeDoorCommand !== -1) {
            // there is an active manual door command, so honor it
            log.trace({
                command: this.activeDoorCommand
            }, 'Sending manual command to door');
            return this.sendCommand(wire, this.activeDoorCommand, []).then(() => {
                log.trace('Send manual door command');
            }).catch((err) => {
                log.error({
                    err: err
                }, 'Error sending manual door commands');
                throw err;
            });
        } else if (closingTime !== null && openingTime !== null) {
            // if we have an auto open time and close time and there is no active manual door command
            if (currentMinutes < openingTime || currentMinutes > closingTime) {
                log.trace('Sending command to close door');
                // we need to close the door
                return this.sendCommand(wire, this.commands.closeDoor, []).then(() => {
                    log.trace('Sent close coop door command');
                }).catch((err) => {
                    log.error({
                        err: err
                    }, 'Error closing coop door');
                    throw err;
                });
            } else {
                log.trace('Sending command to open door');
                // we need to open the door
                return this.sendCommand(wire, this.commands.opemDoor, []).then(() => {
                    log.trace('Sent open coop door command');
                }).catch((err) => {
                    log.error({
                        err: err
                    }, 'Error opening coop door');
                    throw err;
                });
            }
        } else {
            var msg = 'Did not have a valid closing or opening time';
            log.warn(msg);
            Promise.reject(new Error(msg));
        }
    }

    getClosingTime() {
        log.trace('Entering getClosingTime');
        var ret = null;
        var sunset = this.weatherService.getSunset();
        if (sunset) {
            var sunsetMinutes = Number(sunset.hour) * 60 + Number(sunset.minute);
            ret = sunsetMinutes + this.sunsetDeltaMinutes;
        }
        return ret;
    }

    getOpeningTime() {
        log.trace('Entering getOpeningTime');
        var ret = null;
        var sunrise = this.weatherService.getSunrise();
        if (sunrise) {
            var sunriseMinutes = Number(sunrise.hour) * 60 + Number(sunrise.minute);
            ret = sunriseMinutes + this.sunriseDeltaMinutes;
        }
        return ret;
    }

    getReadErrorCount() {
        return this.readErrorCount;
    }

    getWriteErrorCount() {
        return this.writeErrorCount;
    }

    getAutoResetCount() {
        return this.autoResetCount;
    }

    getLastSuccessfulRead() {
        return this.lastSuccessfulRead;
    }

    getLastSuccessfulWrite() {
        return this.lastSuccessfulWrite;
    }

    getLastError() {
        return this.lastError;
    }

    getLongestUptime() {
        return this.longestUptime;
    }
}

module.exports = CoopController;
