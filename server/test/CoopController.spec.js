var assert = require('assert'),
    Promise = require('bluebird'),
    sinon = require('sinon-as-promised')(Promise),
    CoopController = require('../src/CoopController.js');

describe('CoopController', () => {
    var testSunset = {
        hour: 18,
        minute: 30
    };

    var testSunrise = {
        hour: 5,
        minute: 45
    };
    var mockWeatherService = {
        getSunset: function() {
            return testSunset;
        },
        getSunrise: function() {
            return testSunrise;
        }
    };
    var mockNotifyService = {};
    var config = {
        enableNotify: true,
        sunriseDeltaMinutes: 20,
        sunsetDeltaMinutes: 20
    };

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
        var coopController = new CoopController(config, mockWeatherService, mockNotifyService, mockI2c);
        assert.equal(coopController.getClosingTime(), testSunset.hour * 60 + testSunset.minute + config.sunsetDeltaMinutes);
        assert.equal(coopController.getOpeningTime(), testSunrise.hour * 60 + testSunrise.minute + config.sunriseDeltaMinutes);
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
        var mockI2c = function() {
            return {
                writeBytes: function(command, args) {
                    return Promise.resolve();
                },
                read: function(numBytes) {
                    var response = [0, 0, 0, 2];
                    return Promise.resolve(response);
                }
            };
        };
        var coopController = new CoopController(config, mockWeatherService, mockNotifyService, mockI2c);
        return coopController.closeDoor().then((data) => {
            assert.equal(data, 2);
            assert.equal(coopController.readDoor(), 2);
        });
    });

    it('openDoor should send open door command successfully', () => {
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
        var coopController = new CoopController(config, mockWeatherService, mockNotifyService, mockI2c);
        return coopController.openDoor().then((data) => {
            assert.equal(data, 0);
            assert.equal(coopController.readDoor(), 0);
        });
    });


    it('should record read errors', () => {
        //var readStub = sinon.stub();
        //readStub.rejects(new Error('i2c bus error'));
        var mockI2c = function() {
            return {
                writeBytes: function(command, args) {
                    return Promise.resolve();
                },
                read: function(numBytes) {
                    return Promise.reject(new Error('i2c bus error'));
                }
            };
        };
        var coopController = new CoopController(config, mockWeatherService, mockNotifyService, mockI2c);
        return coopController.openDoor().then(() => {
            assert.fail('Expected open door command to return error');
        }).catch((err) => {
            assert(err);
            // it will run one iteration of the read loop (4 commands) before it gets to this command
            assert.equal(coopController.getReadErrorCount(), 5);
        });
    });

    it('should send echo command successfully', () => {
        var mockI2c = function() {
            return {
                writeBytes: function(command, args) {
                    return Promise.resolve();
                },
                read: function(numBytes) {
                    var response = [0, 0, 0, 1];
                    return Promise.resolve(response);
                }
            };
        };
        var coopController = new CoopController(config, mockWeatherService, mockNotifyService, mockI2c);
        return coopController.echo('test').then((data) => {
            assert.equal(data, 1);
        });
    });

    it('should send reset command successfully', () => {
        var mockI2c = function() {
            return {
                writeBytes: function(command, args) {
                    return Promise.resolve();
                },
                read: function(numBytes) {
                    var response = [0, 0, 0, 5];
                    return Promise.resolve(response);
                }
            };
        };
        var coopController = new CoopController(config, mockWeatherService, mockNotifyService, mockI2c);
        return coopController.reset().then((data) => {
            assert.equal(data, 5);
        });
    });

    it('should send auto door command successfully', () => {
        var mockI2c = function() {
            return {
                writeBytes: function(command, args) {
                    return Promise.resolve();
                },
                read: function(numBytes) {
                    var response = [0, 0, 0, 7];
                    return Promise.resolve(response);
                }
            };
        };
        var coopController = new CoopController(config, mockWeatherService, mockNotifyService, mockI2c);
        return coopController.autoDoor().then((data) => {
            assert.equal(data, 7);
        });
    });

});
