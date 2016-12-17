'use strict';

var assert = require('assert'),
    mockery = require('mockery'),
    Promise = require('bluebird'),
    sinon = require('sinon-as-promised')(Promise);

describe('CoopController', function() {
    var testSunset = {
        hour: 18,
        minute: 30
    };

    var testSunrise = {
        hour: 5,
        minute: 45
    };

    class mockNotifyService {
        notifyAll() {
            return Promise.resolve();
        }
    }

    var config = {
        enableNotify: true,
        latitude: 35,
        longitude: -79
    };
    var CoopController = null;

    var mockTimes = null;
    var sunCalcMock = {
        getTimes: function() {
            return mockTimes;
        },
        setTimes: function(times) {
            mockTimes = times;
        }
    };

    before(() => {
        mockery.enable({
            warnOnReplace: false,
            warnOnUnregistered: false
        });
    });

    beforeEach(() => {
        mockery.registerMock('suncalc', sunCalcMock);
        CoopController = require('../src/CoopController.js');
        var now = new Date();
        sunCalcMock.setTimes({
            dusk: new Date('2016-12-15T20:00:00.00Z'),
            sunrise: new Date('2016-12-15T07:00:00.00Z'),
        });
    });

    afterEach(() => {
        mockery.deregisterAll();
    });

    after(() => {
        mockery.disable();
    });

    it('should initialize properly', () => {
        var mockI2c = function() {
            return {
                writeBytes: function(command, args) {
                    return Promise.resolve();
                },
                read: function(numBytes) {
                    var response = [0, 0, 0, 0];
                    return Promise.resolve(response);
                }
            };
        };
        var coopController = new CoopController(config, mockNotifyService, mockI2c);
        assert(coopController.getClosingTime() > coopController.getOpeningTime());
        assert.equal(coopController.isClosing(), false);
        assert.equal(coopController.isOpening(), false);
        assert.equal(coopController.getReadErrorCount(), 0);
        assert.equal(coopController.getWriteErrorCount(), 0);
        assert.equal(coopController.getAutoResetCount(), 0);
        assert.equal(coopController.getLastSuccessfulRead(), -1);
        assert.equal(coopController.getLastSuccessfulWrite(), -1);
        assert.equal(coopController.getLastError(), -1);
        assert.equal(coopController.getLongestUptime(), 0);
        assert.equal(coopController.readDoor(), -1);
        assert.equal(coopController.readTemp(), -1);
        assert.equal(coopController.readMode(), -1);
        assert.equal(coopController.readUptime(), -1);
        assert.equal(coopController.readLight(), -1);
        assert.equal(coopController.readTemp(), -1);
    });

    it('closeDoor should send close door command successfully', () => {
        class mockI2c {
            writeBytes(command, args, callback) {
                callback();
            }
            read(numBytes, callback) {
                var response = [0, 0, 0, 2];
                callback(null, response);
            }
        }
        var coopController = new CoopController(config, new mockNotifyService(), mockI2c);
        return coopController.closeDoor().then((data) => {
            assert.equal(data, 2);
        }).then(() => {
            assert.equal(coopController.readDoor(), 2);
        });
    });

    it('openDoor should send open door command successfully', () => {
        class mockI2c {
            writeBytes(command, args, callback) {
                callback();
            }
            read(numBytes, callback) {
                var response = [0, 0, 0, 0];
                callback(null, response);
            }
        }
        var coopController = new CoopController(config, new mockNotifyService(), mockI2c);
        return coopController.openDoor().then((data) => {
            assert.equal(data, 0);
            assert.equal(coopController.readDoor(), 0);
        });
    });


    it('should record read errors', () => {
        class mockI2c {
            writeBytes(command, args, callback) {
                callback();
            }
            read(numBytes, callback) {
                callback(new Error('i2c bus error'));
            }
        }
        var coopController = new CoopController(config, new mockNotifyService(), mockI2c);
        return coopController.openDoor().then(() => {
            assert.fail('Expected open door command to return error');
        }).catch((err) => {
            assert(err);
            // it will run one iteration of the read loop (4 commands) before it gets to this command
            assert.equal(coopController.getReadErrorCount(), 5);
        });
    });

    it('should send echo command successfully', () => {
        class mockI2c {
            writeBytes(command, args, callback) {
                callback();
            }
            read(numBytes, callback) {
                var response = [0, 0, 0, 1];
                callback(null, response);
            }
        }
        var coopController = new CoopController(config, new mockNotifyService(), mockI2c);
        return coopController.echo('test').then((data) => {
            assert.equal(data, 1);
        });
    });

    it('should send reset command successfully', () => {
        class mockI2c {
            writeBytes(command, args, callback) {
                callback();
            }
            read(numBytes, callback) {
                var response = [0, 0, 0, 5];
                callback(null, response);
            }
        }
        var coopController = new CoopController(config, new mockNotifyService(), mockI2c);
        return coopController.reset().then((data) => {
            assert.equal(data, 5);
        });
    });

    it('should send auto door command successfully', () => {
        class mockI2c {
            writeBytes(command, args, callback) {
                callback();
            }
            read(numBytes, callback) {
                var response = [0, 0, 0, 7];
                callback(null, response);
            }
        }
        var coopController = new CoopController(config, new mockNotifyService(), mockI2c);
        return coopController.autoDoor().then((data) => {
            assert.equal(data, 7);
        });
    });

    function testCheckDoorOnTimeChange(times, expectedCommand) {
        class mockI2c {
            writeBytes(command, args, callback) {
                // restore clock back so it will advance normally for the
                // setTimeout for 50 secs coming before the read
                callback();
            }
            read(numBytes, callback) {
                var response = [];
                callback(null, response);
            }
        }
        var wire = new mockI2c();
        sunCalcMock.setTimes(times);

        var coopController = new CoopController(config, new mockNotifyService(), mockI2c);
        var sendCommandSpy = sinon.spy(coopController, 'sendCommand');

        return coopController.checkDoor(wire).then(() => {
            assert.equal(sendCommandSpy.withArgs(wire, expectedCommand, []).calledOnce, true);
        });
    }

    it('should automatically close door at dusk', () => {
        var now = new Date();
        // lets make dusk an hour from now, and then advance the fake clock to auto close the door
        return testCheckDoorOnTimeChange({
            dusk: new Date(now.getTime()),
            sunrise: new Date(now.getTime() - 8 * 3600 * 1000),
        }, 5);
    });

    it('should automatically open door at sunrise', () => {
        var now = new Date();
        // lets make dusk an hour from now, and then advance the fake clock to auto close the door
        return testCheckDoorOnTimeChange({
            dusk: new Date(now.getTime() + 10 * 3600 * 1000),
            sunrise: new Date(now.getTime()),
        }, 6);
    });
});
