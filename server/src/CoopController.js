'use strict';

var _ = require('lodash'),
    i2c = require('./i2cWrapper.js'),
    Promise = require('bluebird'),
    suncalc = require('suncalc'),
    log = require('./logger.js')();

// config: key/value object with sunsetDeltaMinutes, sunriseDeltaMinutes, enableMailNotify
// weatherService: weatherunderground service wrapper
// notifyService: notification service with notify() method
// i2c: i2c wire wrapper with read/writeBytes methods
class CoopController {

    constructor(config, notifyService, customI2c) {
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
        this.longitude = config.longitude;
        this.latitude = config.latitude;
        this.enableNotify = config.enableNotify;
        this.notifyService = notifyService;
        this.commandQueue = [];
        this.writeErrorCount = 0;
        this.readErrorCount = 0;
        this.autoResetCount = 0;
        this.lastSuccessfulRead = -1;
        this.lastSuccessfulWrite = -1;
        this.lastSuccessfulDoorCommand = new Date();
        this.lastError = -1;
        this.longestUptime = 0;
        this.timeToTransition = 15000;
        this.activeDoorCommand = -1;
        this.doorCommandExpiration = null;
        this.lastNonErrorDoorState = null;
        this.lastMode = null;
        this.delayBetween = 100;

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

        this.start();
    }

    sendCommand(wire, command, args) {
        log.trace({
            command: command,
            args: args
        }, 'Entering sendCommand');
        if (!this.messageInProgress) {
            this.messageInProgress = true;
            log.debug({
                command: command,
                args: args
            }, 'Sending i2C command');
            return new Promise((resolve, reject) => {
                wire.writeBytes(command, args, (err) => {
                    if (err) {
                        this.messageInProgress = false;
                        this.lastError = new Date();
                        this.writeErrorCount++;
                        log.error({
                            command: command,
                            args: args,
                            err: err
                        }, 'Error writing data to i2c bus');
                        reject(err);
                    } else {
                        log.debug({
                            command: command,
                            args: args
                        }, 'Wrote data to i2c bus successfully');
                        this.lastSuccessfulWrite = new Date();
                        if (command === this.commands.openDoor || command === this.commands.closeDoor) {
                            this.lastSuccessfulDoorCommand = new Date();
                        }
                        // need to delay nefore reading or it causes errors (probably due to long distance)
                        setTimeout(() => {
                            wire.read(4, (err, readBytes) => {
                                if (err) {
                                    this.messageInProgress = false;
                                    this.lastError = new Date();
                                    this.readErrorCount++;
                                    log.error({
                                        command: command,
                                        args: args,
                                        err: err
                                    }, 'Error reading data from i2c bus');
                                    reject(err);
                                } else {
                                    this.messageInProgress = false;
                                    this.lastSuccessfulRead = new Date();
                                    var reading = (readBytes[0] << 24) + (readBytes[1] << 16) + (readBytes[2] << 8) + readBytes[3];
                                    log.debug({
                                        command: command,
                                        args: args,
                                        readBytes: readBytes,
                                        reading: reading
                                    }, 'Read data from i2c bus');
                                    resolve(reading);
                                }
                            });
                        }, 50);
                    }
                });
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

    sendReadDoorCommand(wire) {
        log.trace('Entering sendReadDoorCommand');
        return this.sendCommand(wire, this.commands.readDoor, []).then((door) => {
            // first lets compare current state against previous state and send a notification of state change if necessary
            if (this.lastNonErrorDoorState === this.doorStates.transitioning) {
                if (door === this.doorStates.open) {
                    log.info('Door is now open');
                    if (this.enableNotify === true) {
                        this.notifyService.notifyAll('Coop door opened.')
                            .then(() => {
                                log.info('Notification sent');
                            }).catch((err) => {
                                log.error({
                                    err: err
                                }, 'Error sending notification');
                            });
                    }
                } else if (door === this.doorStates.closed) {
                    log.info('Door is now closed');
                    if (this.enableNotify === true) {
                        this.notifyService.notifyAll('Coop door closed.')
                            .then(() => {
                                log.info('Notification sent');
                            }).catch((err) => {
                                log.error({
                                    err: err
                                }, 'Error sending notification');
                            });
                    }
                } else if (door === this.doorStates.transitioning) {
                    log.info('Door is transitioning');
                } else {
                    log.error('Invalid door state received');
                }
            }
            if (door !== this.doorStates.open && door !== this.doorStates.closed) {
                if (door === this.doorStates.transitioning) {
                    log.info('Door is transitioning');
                    this.lastNonErrorDoorState = this.state.door = door;
                } else {
                    log.error('Door is in invalid state');
                }
            } else {
                this.lastNonErrorDoorState = this.state.door = door;
            }
        });
    }

    sendReadOverrideCommand(wire) {
        log.trace('Entering sendReadOverrideCommand');
        return this.sendCommand(wire, this.commands.readMode, []).then((mode) => {
            this.state.mode = mode;
            if (this.state.mode != this.lastMode) {
                log.info({
                    mode: this.state.mode
                }, 'Door mode changed');
                this.lastMode = this.state.mode;
            }
        });
    }

    sendReadUptimeCommand(wire) {
        log.trace('Entering sendReadUptimeCommand');
        return this.sendCommand(wire, this.commands.readUptime, []).then((uptime) => {
            if (uptime > this.longestUptime) {
                this.longestUptime = uptime;
            }
            if (uptime < this.state.uptime && uptime > 0 && this.state.uptime < (Math.pow(2, 32) - 10000)) {
                this.autoResetCount++;
                log.error({
                    uptime: uptime,
                    lastUptime: this.state.uptime
                }, 'Coop controller reset');
            }
            this.state.uptime = uptime;
        });
    }

    sendManualCommand(wire, command) {
        return this.sendCommand(wire, command.command, command.args).then((data) => {
            if (command.command === this.commands.reset) {
                this.state.uptime = -1;
            }
            command.resolve(data);
        }).catch((err) => {
            log.error({
                err: err
            }, 'Error sending command');
            command.reject(err);
        });
    }

    runAutoCommands(wire) {
        // now start repeating automatic command loop
        log.trace('Reading uptime');
        return this.sendReadUptimeCommand(wire).catch((err) => {
            log.error('Error reading uptime');
            // always keep going even if error
        }).delay(this.delayBetween).then(() => {
            log.trace('Reading door state');
            return this.sendReadDoorCommand(wire).catch((err) => {
                log.error('Error reading door');
                this.state.door = -1;
                // always keep going even if error
            });
        }).delay(this.delayBetween).then(() => {
            log.trace('Reading override mode');
            return this.sendReadOverrideCommand(wire).catch((err) => {
                log.error('Error reading override mode');
                this.state.mode = -1;
                // always keep going even if error
            });
        }).delay(this.delayBetween).then(() => {
            log.trace('checking door');
            return this.checkDoor(wire, this.state.door).catch((err) => {
                log.error('Error checking door');
                // always keep going even if error
            });
        });
    }

    // update all of the readable state from the coop
    sync(wire) {
        log.trace({
            commandLength: this.commandQueue.length
        }, 'Servicing queued commands');

        var currentCommandQueue = _.clone(this.commandQueue);
        this.commandQueue = [];

        return Promise.mapSeries(currentCommandQueue, (command) => {
            return this.sendManualCommand(wire, command).delay(this.delayBetween);
        }).then(() => {
            log.trace('Manual commands ran successfully');
        }).catch((err) => {
            log.error({
                err: err
            }, 'Error running manual commands');
        }).then(() => {
            return this.runAutoCommands(wire);
        });
    }

    start() {
        log.trace('Entering updateState');
        log.debug({
            address: this.i2cAddress
        }, 'Joining i2C bus');
        var wire = new this.i2c(this.i2cAddress, {
            device: '/dev/i2c-1',
            debug: false
        }); // point to your i2c address, debug provides REPL interface

        return this.syncLoop(wire);
    }

    // repeatedly update all of the readable state from the coop
    syncLoop(wire) {
        return this.sync(wire).then(() => {
            log.trace('sync finished successfully');
        }).catch((err) => {
            log.error({
                err: err
            }, 'sync finished with error');
            // always keep going even if error
        }).delay(1000).then(() => {
            // if the last successful time we checked and veified the door state was greater than a minute
            // force a reset of the coop controller
            var now = new Date();
            if ((now.getTime() - this.lastSuccessfulDoorCommand.getTime()) > 60000) {
                // the watchdog timer resets if there is 5 seconds of no successful commands,
                // so lets hold commands for 6 seconds
                log.info('Its been longer than one minute since successful door command; waiting 6 seconds to let the watchdog timer reset controller');
                return Promise.delay(6000).then(() => {
                    // reset the last successful so we dont trigger another wait for at least a minute
                    this.lastSuccessfulDoorCommand = new Date();
                });
            }
        }).then(() => {
            return this.syncLoop(wire);
        });
    }

    requestCommand(command, args) {
        log.trace({
            command: command,
            args: args
        }, 'Entering requestCommand');
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

    getClosingTime() {
        log.trace('Entering getClosingTime');
        var times = suncalc.getTimes(new Date(), this.latitude, this.longitude);
        var sunsetMinutes = times.dusk.getHours() * 60 + times.dusk.getMinutes();
        return sunsetMinutes;
    }

    getOpeningTime() {
        log.trace('Entering getOpeningTime');
        var times = suncalc.getTimes(new Date(), this.latitude, this.longitude);
        var sunriseMinutes = times.sunrise.getHours() * 60 + times.sunrise.getMinutes();
        return sunriseMinutes;
    }

    getDoorCommandExpiration() {
        log.trace('Entering getDoorCommandExpiration');
        var currentTime = new Date();
        var times = suncalc.getTimes(currentTime, this.latitude, this.longitude);
        var ret = null;
        if (currentTime.getTime() <= times.sunrise.getTime()) {
            // today sunrise
            ret = times.sunrise;
            log.trace({
                ret: ret
            }, 'Returning from getDoorCommandExpiration with todays opening time');
            return ret;
        } else if (currentTime.getTime() > times.sunrise.getTime() && currentTime.getTime() < times.dusk.getTime()) {
            // today sunset
            ret = times.dusk;
            log.trace({
                ret: ret
            }, 'Returning from getDoorCommandExpiration with todays closing time');
            return ret;
        }
        // else tomorrow opening time
        ret = new Date(times.sunrise.getTime() + (24 * 3600 * 1000));
        log.trace({
            ret: ret
        }, 'Returning from getDoorCommandExpiration with tomorrows sunrise');
        return ret;
    }

    checkDoor(wire) {
        log.trace('Entering checkDoor');
        var currentTime = new Date();
        // check if last manual door command needs to expire
        if (this.activeDoorCommand !== -1 && currentTime.getTime() >= this.doorCommandExpiration.getTime()) {
            log.info({
                command: this.activeDoorCommand
            }, 'Manual door command expired, resetting it');
            this.activeDoorCommand = -1;
            this.doorCommandExpiration = null;
        }

        if (this.activeDoorCommand !== -1) {
            // there is an active manual door command, so honor it
            log.trace({
                command: this.activeDoorCommand
            }, 'Sending manual command to door');
            return this.sendCommand(wire, this.activeDoorCommand, []).then(() => {
                log.trace('Send manual door command');
            }).catch((err) => {
                var msg = 'Error sending manual door commands';
                log.error({
                    err: err
                }, msg);
                return Promise.reject(new Error(msg));
            });
        } else {
            var times = suncalc.getTimes(new Date(), this.latitude, this.longitude);
            // if we have an auto open time and close time and there is no active manual door command
            if (currentTime.getTime() < times.sunrise.getTime() || currentTime.getTime() >= times.dusk.getTime()) {
                log.trace('Sending command to close door');
                // we need to close the door
                return this.sendCommand(wire, this.commands.closeDoor, []).then(() => {
                    log.trace('Sent close coop door command');
                }).catch((err) => {
                    var msg = 'Error closing coop door';
                    log.error({
                        err: err
                    }, msg);
                    return Promise.reject(new Error(msg));
                });
            } else {
                log.trace('Sending command to open door');
                // we need to open the door
                return this.sendCommand(wire, this.commands.openDoor, []).then(() => {
                    log.trace('Sent open coop door command');
                }).catch((err) => {
                    var msg = 'Error opening coop door';
                    log.error({
                        err: err
                    }, msg);
                    return Promise.reject(new Error(msg));
                });
            }
        }
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
